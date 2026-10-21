// Shared frontend types + display constants.

export type Role = 'admin' | 'manager' | 'employee';
export type Status = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  createdAt: string;
  creator?: { id: number; name: string };
  _count?: { tasks: number };
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  labels: string;
  dueDate: string | null;
  projectId: number;
  project?: { id: number; name: string };
  assignedTo: number | null;
  assignee?: { id: number; name: string; email: string; role: Role } | null;
  createdBy: number;
  creator?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TaskComment {
  id: number;
  body: string;
  taskId: number;
  authorId: number;
  author: { id: number; name: string; email: string; role: Role };
  createdAt: string;
}

export const STATUSES: Status[] = ['todo', 'in_progress', 'done'];
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};
