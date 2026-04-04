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
   * Conciliación financiera proactiva a las 02:00 AM AST.
   * Analiza suscripciones, impresiones y pagos del periodo actual.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleReconciliation() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.logger.log(`🌙 Iniciando conciliación automática para el periodo ${period}...`);
    try {
      const result = await this.biService.generateReconciliationReport(period);
      this.logger.log(`✅ Conciliación completada: ${result.total} registros procesados.`);
    } catch (error) {
      this.logger.error('❌ Falla en conciliación automática:', error.message);
    }
  }
}
