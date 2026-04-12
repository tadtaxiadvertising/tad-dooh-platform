import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_RULES } from '../../common/constants/business-rules';

@Injectable()
export class PayrollAuditService {
  private readonly logger = new Logger(PayrollAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CronJob mensual (Día 1) para evaluar desempeño del mes anterior
   * y marcar penalizaciones consecutivas.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async runMonthlyAudit() {
    this.logger.log('Iniciando auditoría mensual de nómina y penalizaciones...');
    
    const drivers = await this.prisma.driver.findMany({
      where: { status: 'ACTIVE' }
    });

    for (const driver of drivers) {
      const levelKey = (driver.level || 'BASE') as keyof typeof BUSINESS_RULES.LEVELS;
      const levelConfig = BUSINESS_RULES.LEVELS[levelKey];
      
      // Obtener el último pago registrado (que debería contener las horas del mes que acaba de cerrar)
      const lastPayment = await this.prisma.payrollPayment.findFirst({
        where: { driverId: driver.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastPayment) continue;

      const underGoal = lastPayment.transmissionHours < levelConfig.hours;

      if (underGoal) {
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: { 
            consecutiveMonthsUnderGoal: { increment: 1 } 
          }
        });
        this.logger.warn(`⚠️ Chofer ${driver.fullName}: ${lastPayment.transmissionHours}h vs Meta ${levelConfig.hours}h.`);
      } else {
        await this.prisma.driver.update({
          where: { id: driver.id },
          data: { consecutiveMonthsUnderGoal: 0 }
        });
      }
    }
    this.logger.log('Auditoría mensual completada.');
  }

  /**
   * Aplica la lógica de penalización al monto base
   */
  async applyPenaltyLogic(driverId: string, amount: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { consecutiveMonthsUnderGoal: true, level: true }
    });

    if (!driver) return { amount, penaltyApplied: false };

    // Penalización del 10% si lleva 2 o más meses incumpliendo
    if (driver.consecutiveMonthsUnderGoal >= 2) {
      const penaltyRate = BUSINESS_RULES.LEVELS.BASE.penalty; // 0.10
      const finalAmount = amount * (1 - penaltyRate);
      return { 
        amount: finalAmount, 
        penaltyApplied: true,
        penaltyAmount: amount * penaltyRate
      };
    }

    return { amount, penaltyApplied: false, penaltyAmount: 0 };
  }
}
