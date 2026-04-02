import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BiService } from './bi.service';

@Injectable()
export class BiScheduler {
  private readonly logger = new Logger(BiScheduler.name);

  constructor(private readonly biService: BiService) {}

  /**
   * Generar snapshot de BI cada medianoche (00:00 AST).
   * Los snapshots permiten comparar rendimiento histórico sin queries pesadas en runtime.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySnapshot() {
    this.logger.log('🚀 Iniciando generación de snapshot diario de BI...');
    try {
      // Simplemente llamar a getMasterKpis disparará la lógica de snapshot
      // si no existe uno para hoy.
      await this.biService.getMasterKpis();
      this.logger.log('✅ Snapshot diario generado con éxito.');
    } catch (error) {
      this.logger.error('❌ Error al generar snapshot de BI:', error.message);
    }
  }

  /**
   * Refresco proactivo de salud de flota cada hora.
   * Útil para detectar tendencias de desconexión masiva.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleFleetHealthCheck() {
    this.logger.log('🔍 Ejecutando chequeo proactivo de salud de flota...');
    try {
      const health = await this.biService.getFleetHealth();
      this.logger.log(`📊 Salud de flota procesada: ${health.length} dispositivos analizados.`);
    } catch (error) {
       this.logger.error('❌ Error en chequeo de salud de flota:', error.message);
    }
  }
}
