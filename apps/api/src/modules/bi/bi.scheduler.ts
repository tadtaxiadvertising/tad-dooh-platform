import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BiService } from './bi.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BiScheduler {
  private readonly logger = new Logger(BiScheduler.name);

  constructor(
    private readonly biService: BiService,
    private readonly prisma: PrismaService
  ) { }

  /**
   * Generar snapshot de BI cada medianoche (00:00 AST).
   * Los snapshots permiten comparar rendimiento hist\u00f3rico sin queries pesadas en runtime.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySnapshot() {
    this.logger.log('\ud83d\ude80 Iniciando generaci\u00f3n de snapshot diario de BI...');
    try {
      await this.biService.getMasterKpis();
      this.logger.log('\u2705 Snapshot diario generado con \u00e9xito.');
    } catch (error) {
      this.logger.error('\u274c Error al generar snapshot de BI:', error.message);
    }
  }

  /**
   * Conciliaci\u00f3n financiera proactiva a las 02:00 AM AST.
   * Analiza suscripciones, impresiones y pagos del periodo actual.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleReconciliation() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.logger.log(`\ud83c\udf19 Iniciando conciliaci\u00f3n autom\u00e1tica para el periodo ${period}...`);
    try {
      const result = await this.biService.generateReconciliationReport(period);
      this.logger.log(`\u2705 Conciliaci\u00f3n completada: ${result.total} registros procesados.`);
    } catch (error) {
      this.logger.error('\u274c Falla en conciliaci\u00f3n autom\u00e1tica:', error.message);
    }
  }

  /**
   * VULN #4 PATCH (v12.1.2): IdempotencyKey TTL Cleanup at 04:00 AM AST.
   * Purges expired idempotency records from the DB-backed store to prevent
   * unbounded table growth. Scheduled after the 03:00 AM maintenance jobs
   * to avoid any overlap with delinquency/orphan cleanup processing.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleIdempotencyCleanup() {
    this.logger.log('\ud83e\uddf9 [IDEMPOTENCY_TTL] Purging expired idempotency keys...');
    try {
      // Release stale locks first (PROCESSING keys older than 1h are orphans from crashed requests)
      const staleLocks = await this.prisma.idempotencyKey.updateMany({
        where: {
          isLocked: true,
          createdAt: { lt: new Date(Date.now() - 3600000) } // older than 1h
        },
        data: { isLocked: false }
      });
      this.logger.log(`\u26a0 Released ${staleLocks.count} stale idempotency locks (orphaned from crashed requests).`);

      // Purge all expired keys (expiresAt < now)
      const deleted = await this.prisma.idempotencyKey.deleteMany({
        where: { expiresAt: { lt: new Date() } }
      });
      this.logger.log(`\u2705 Purged ${deleted.count} expired idempotency keys.`);
    } catch (error) {
      this.logger.error('\u274c Error in idempotency cleanup:', error.message);
    }
  }
}