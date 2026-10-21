import { STATUS_LABELS } from './constants';
import { prisma } from './prisma';

/**
 * Notification rules:
 *  - a task is assigned to a user          -> "You were assigned to ..."
 *  - a task assigned to a user changes state -> "Status of ... changed to ..."
 *  - a task assigned to a user is updated    -> "Task ... was updated"
 * Users never get notified about their own actions.
 */

async function push(userId: number | null, actorId: number, message: string) {
  if (!userId || userId === actorId) return;
  await prisma.notification.create({ data: { userId, message } });
}

export function notifyAssigned(assigneeId: number | null, actorId: number, title: string) {
  return push(assigneeId, actorId, `You were assigned to "${title}"`);
}

export function notifyStatusChanged(assigneeId: number | null, actorId: number, title: string, status: string) {
  const label = STATUS_LABELS[status] ?? status;
  return push(assigneeId, actorId, `Status of "${title}" changed to ${label}`);
}

export function notifyUpdated(assigneeId: number | null, actorId: number, title: string) {
  return push(assigneeId, actorId, `Task "${title}" was updated`);
}
