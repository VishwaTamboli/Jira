import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { isPriority, isStatus } from '../lib/constants';
import { notifyAssigned, notifyStatusChanged, notifyUpdated } from '../lib/notifications';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const taskInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  creator: { select: { id: true, name: true } },
};

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Labels arrive as a comma separated string or an array of strings. */
function parseLabels(value: unknown): string {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(',');
  }
  if (Array.isArray(value)) {
    return value.map((l) => String(l).trim()).filter(Boolean).join(',');
  }
  return '';
}

/** Returns { ok:false } for invalid dates, { ok:true, value } otherwise. */
function parseDueDate(value: unknown): { ok: boolean; value?: Date | null } {
  if (value === undefined) return { ok: true }; // field not provided
  if (value === null || value === '') return { ok: true, value: null };
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value: date };
}

// GET /api/tasks?search=&status=&priority=&assignee=&projectId=
router.get('/', async (req, res) => {
  const user = getAuthUser(req);
  const { search, status, priority, assignee, projectId } = req.query;

  const where: Prisma.TaskWhereInput = {};

  if (search && typeof search === 'string') {
    where.title = { contains: search };
  }
  if (status !== undefined && status !== '' && isStatus(status)) {
    where.status = status;
  }
  if (priority !== undefined && priority !== '' && isPriority(priority)) {
    where.priority = priority;
  }
  if (assignee === 'me') {
    where.assignedTo = user.id;
  } else if (assignee && assignee !== '') {
    const id = Number(assignee);
    if (Number.isInteger(id)) where.assignedTo = id;
  }
  if (projectId && projectId !== '') {
    const id = Number(projectId);
    if (Number.isInteger(id)) where.projectId = id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { updatedAt: 'desc' },
  });
  return res.json(tasks);
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  return res.json(task);
});

// POST /api/tasks - anyone can create a task.
router.post('/', async (req, res) => {
  const user = getAuthUser(req);
  const { title, description, status, priority, labels, dueDate, projectId, assignedTo } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  const pid = Number(projectId);
  if (!Number.isInteger(pid)) {
    return res.status(400).json({ error: 'A project is required' });
  }
  const project = await prisma.project.findUnique({ where: { id: pid } });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (status !== undefined && !isStatus(status)) {
    return res.status(400).json({ error: 'Status must be todo, in_progress or done' });
  }
  if (priority !== undefined && !isPriority(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium or high' });
  }

  let assignedToId: number | null = null;
  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
    const aid = Number(assignedTo);
    if (!Number.isInteger(aid)) return res.status(400).json({ error: 'Invalid assignee' });
    const assignee = await prisma.user.findUnique({ where: { id: aid } });
    if (!assignee) return res.status(400).json({ error: 'Assignee not found' });
    assignedToId = aid;
  }

  const due = parseDueDate(dueDate);
  if (!due.ok) return res.status(400).json({ error: 'Invalid due date' });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: typeof description === 'string' ? description : '',
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      labels: parseLabels(labels),
      dueDate: due.value ?? null,
      projectId: pid,
      assignedTo: assignedToId,
      createdBy: user.id,
    },
    include: taskInclude,
  });

  if (assignedToId) await notifyAssigned(assignedToId, user.id, task.title);
  return res.status(201).json(task);
});

// PUT /api/tasks/:id - managers/admins can edit any task; employees can edit
// tasks assigned to them or created by them. ANYONE can change the assignee.
router.put('/:id', async (req, res) => {
  const user = getAuthUser(req);
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const canManage = user.role === 'admin' || user.role === 'manager';
  const isParticipant = existing.assignedTo === user.id || existing.createdBy === user.id;

  const body = req.body ?? {};
  const data: Prisma.TaskUncheckedUpdateInput = {};

  // Anyone may change the assignee of any task. Other edits require being a
  // manager/admin or a participant (the assignee or the creator).
  const changingOnlyAssignee =
    body.assignedTo !== undefined &&
    ['title', 'description', 'status', 'priority', 'labels', 'dueDate', 'projectId'].every(
      (f) => body[f] === undefined,
    );
  if (!canManage && !isParticipant && !changingOnlyAssignee) {
    return res.status(403).json({ error: 'You can only update tasks assigned to you' });
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return res.status(400).json({ error: 'Task title cannot be empty' });
    }
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }
    data.description = body.description;
  }
  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return res.status(400).json({ error: 'Status must be todo, in_progress or done' });
    }
    data.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!isPriority(body.priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium or high' });
    }
    data.priority = body.priority;
  }
  if (body.labels !== undefined) data.labels = parseLabels(body.labels);
  if (body.dueDate !== undefined) {
    const due = parseDueDate(body.dueDate);
    if (!due.ok) return res.status(400).json({ error: 'Invalid due date' });
    data.dueDate = due.value ?? null;
  }

  // Moving a task between projects is a manager/admin action.
  if (body.projectId !== undefined) {
    const pid = Number(body.projectId);
    if (!Number.isInteger(pid)) return res.status(400).json({ error: 'Invalid project' });
    if (pid !== existing.projectId) {
      if (!canManage) return res.status(403).json({ error: 'You cannot move tasks between projects' });
      const project = await prisma.project.findUnique({ where: { id: pid } });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      data.projectId = pid;
    }
  }

  // Anyone can reassign a task to anyone (no-op if the value is unchanged).
  if (body.assignedTo !== undefined) {
    const nextId = body.assignedTo === null || body.assignedTo === '' ? null : Number(body.assignedTo);
    if (nextId !== null && !Number.isInteger(nextId)) {
      return res.status(400).json({ error: 'Invalid assignee' });
    }
    if (nextId !== existing.assignedTo) {
      if (nextId !== null) {
        const assignee = await prisma.user.findUnique({ where: { id: nextId } });
        if (!assignee) return res.status(400).json({ error: 'Assignee not found' });
      }
      data.assignedTo = nextId;
    }
  }

  if (Object.keys(data).length === 0) {
    const unchanged = await prisma.task.findUnique({ where: { id }, include: taskInclude });
    return res.json(unchanged);
  }

  const task = await prisma.task.update({ where: { id }, data, include: taskInclude });

  // Notifications for the assignee (never for the actor's own action).
  const assigneeId = existing.assignedTo;
  const assignChanged = 'assignedTo' in data && data.assignedTo !== existing.assignedTo;
  const statusChanged = data.status !== undefined && data.status !== existing.status;
  if (assignChanged) {
    await notifyAssigned(Number(data.assignedTo) || null, user.id, existing.title);
  } else if (statusChanged && data.status) {
    await notifyStatusChanged(assigneeId, user.id, existing.title, String(data.status));
  } else {
    await notifyUpdated(assigneeId, user.id, existing.title);
  }

  return res.json(task);
});

// DELETE /api/tasks/:id (admin/manager)
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  await prisma.task.delete({ where: { id } });
  return res.json({ ok: true });
});

export default router;
