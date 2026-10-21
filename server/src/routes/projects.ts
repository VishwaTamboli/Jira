import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const projectInclude = {
  creator: { select: { id: true, name: true } },
  _count: { select: { tasks: true } },
};

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/projects
router.get('/', async (_req, res) => {
  const projects = await prisma.project.findMany({
    include: projectInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

// POST /api/projects - any authenticated user can create a project.
router.post('/', async (req, res) => {
  const { name, description } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const user = getAuthUser(req);
  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      createdBy: user.id,
    },
    include: projectInclude,
  });
  return res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  const project = await prisma.project.findUnique({ where: { id }, include: projectInclude });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.json(project);
});

// PUT /api/projects/:id - admins/managers, or the project creator.
router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const user = getAuthUser(req);
  if (user.role !== 'admin' && user.role !== 'manager' && existing.createdBy !== user.id) {
    return res.status(403).json({ error: 'Only managers, admins or the project creator can edit it' });
  }

  const { name, description } = req.body ?? {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Project name cannot be empty' });
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined
        ? { description: typeof description === 'string' ? description.trim() : '' }
        : {}),
    },
    include: projectInclude,
  });
  return res.json(project);
});

// DELETE /api/projects/:id (admins/managers, or the project creator) -
// tasks are removed via cascade.
router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid project id' });
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const user = getAuthUser(req);
  if (user.role !== 'admin' && user.role !== 'manager' && existing.createdBy !== user.id) {
    return res.status(403).json({ error: 'Only managers, admins or the project creator can delete it' });
  }

  await prisma.project.delete({ where: { id } });
  return res.json({ ok: true });
});

export default router;
