import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Aquí puedes agregar logs para ver los queries en modo debug si lo deseas
    super();
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

  async onModuleDestroy() {
    this.logger.warn('Cerrando conexión a Supabase (Serverless Teardown)...');
    await this.$disconnect();
  }
}

