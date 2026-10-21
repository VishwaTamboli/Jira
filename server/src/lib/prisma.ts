import { PrismaClient } from '@prisma/client';

// Single shared Prisma client. The schema lives in ../prisma at the project
// root, and @prisma/client is installed there (the server resolves it by
// walking up node_modules).
export const prisma = new PrismaClient();
