import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    this.logger.log('Inicializando conexión a Supabase...');
    try {
      await this.$connect();
      this.logger.log('✅ Conexión establecida con éxito');
    } catch (e) {
      this.logger.error('❌ Error fatal al conectar a la base de datos', e);
    }
  }

  // Crítico para Vercel: Cerramos la conexión al terminar la ejecución de la función lambda
  async onModuleDestroy() {
    this.logger.warn('Cerrando conexión a Supabase (Serverless Teardown)...');
    await this.$disconnect();
  }
}
