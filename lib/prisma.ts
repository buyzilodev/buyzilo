import { PrismaClient, type Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prismaLogLevels: Prisma.LogLevel[] =
  process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogLevels,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

