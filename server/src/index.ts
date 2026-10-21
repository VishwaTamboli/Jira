import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { PORT } from './lib/config';
import authRouter from './routes/auth';
import commentsRouter from './routes/comments';
import notificationsRouter from './routes/notifications';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import usersRouter from './routes/users';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/tasks/:taskId/comments', commentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/users', usersRouter);

// Unknown API routes.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (also catches rejected async handlers in Express 5).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : typeof (err as { statusCode?: number })?.statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500;

  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : (err as Error)?.message || 'Bad request',
  });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
