import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/notifications - only the current user's notifications.
router.get('/', async (req, res) => {
  const user = getAuthUser(req);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json(notifications);
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  const user = getAuthUser(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid notification id' });

  const notification = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  return res.json(updated);
});

export default router;
