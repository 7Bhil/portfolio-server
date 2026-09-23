import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient — évite de créer 7 connexions séparées à la DB
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
