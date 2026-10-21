import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { isRole } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireAuth, signToken } from '../middleware/auth';

const router = Router();

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true };

const EMAIL_RE = /^\S+@\S+\.\S+$/;

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  // Demo simplification: registration may pick a role (defaults to employee).
  const finalRole = role === undefined || role === null ? 'employee' : role;
  if (!isRole(finalRole)) {
    return res.status(400).json({ error: 'Role must be admin, manager or employee' });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalizedEmail, password: hashed, role: finalRole },
    select: userSelect,
  });

  const token = signToken(user as { id: number; name: string; email: string; role: string });
  return res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  const { password: _pw, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

// JWT is stateless: the client discards its token on logout.
router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = getAuthUser(req);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: userSelect });
  if (!dbUser) {
    return res.status(401).json({ error: 'Account no longer exists' });
  }
  return res.json({ user: dbUser });
});

export default router;
