import { Request, Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth } from '../middleware/auth';

// Mounted at /api/tasks/:taskId/comments (mergeParams gives us :taskId).
const router = Router({ mergeParams: true });

router.use(requireAuth);

const authorSelect = { id: true, name: true, email: true, role: true };

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// The router is mounted at /api/tasks/:taskId/comments, so the param is
// available inside via mergeParams.
function taskIdParam(req: Request): number | null {
  return parseId((req.params as { taskId?: string }).taskId);
}

// GET /api/tasks/:taskId/comments
router.get('/', async (req: Request, res) => {
  const taskId = taskIdParam(req);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: authorSelect } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(comments);
});

// POST /api/tasks/:taskId/comments - any authenticated user may comment.
router.post('/', async (req: Request, res) => {
  const taskId = taskIdParam(req);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { body } = req.body ?? {};
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const user = getAuthUser(req);
  const comment = await prisma.taskComment.create({
    data: { body: body.trim(), taskId, authorId: user.id },
    include: { author: { select: authorSelect } },
  });
  return res.status(201).json(comment);
});

export default router;