import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ============================================
// Vercel Serverless-Safe Prisma Singleton
// ============================================

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['query', 'error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    this.logger = new Logger(PrismaService.name);

    // Reuse existing global instance if available (warm start)
    if (globalForPrisma.__prisma) {
      return globalForPrisma.__prisma as unknown as PrismaService;
    }

    // Store in global scope for reuse across warm invocations
    globalForPrisma.__prisma = this;
    this.logger.log('🔌 New PrismaClient instance created (cold start)');
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (e) {
      this.logger.error('❌ Fatal Database Error during $connect!', e);
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting Prisma...');
    await this.$disconnect();
  }
}

