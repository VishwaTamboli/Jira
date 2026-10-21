import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../lib/config';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

/** Returns the user attached by requireAuth (throws if missing). */
export function getAuthUser(req: Request): AuthUser {
  const user = (req as unknown as { user?: AuthUser }).user;
  if (!user) throw new Error('Authentication required');
  return user;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
    subject: String(user.id),
    expiresIn: JWT_EXPIRES_IN,
  });
}

/** Verifies the "Authorization: Bearer <token>" header. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const user: AuthUser = {
      id: Number(payload.sub),
      name: String(payload.name ?? ''),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? ''),
    };
    if (!Number.isInteger(user.id)) throw new Error('bad payload');
    (req as unknown as { user: AuthUser }).user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Restricts a route to the given roles (used after requireAuth). */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: AuthUser }).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that' });
    }
    return next();
  };
}
