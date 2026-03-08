import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    if (globalForPrisma.prisma) {
      return globalForPrisma.prisma as PrismaService;
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.error('Fatal Database Error: Prisma encountered a native exception during $connect!', e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
