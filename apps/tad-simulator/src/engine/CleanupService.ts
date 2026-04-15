import { PrismaClient as SimulatorPrisma } from '../generated/client';
import { createAppPrismaClient } from './app-prisma';

export class CleanupService {
  private appPrisma = createAppPrismaClient();
  private localPrisma = new SimulatorPrisma();

  async nukeSimulationData() {
    console.log('🧹 [Cleanup] Starting simulation data purge...');
    try {
      // Usamos una transacción para asegurar integridad.
      // Borramos de abajo hacia arriba en la jerarquía
      
      // 1. Borrar Logs Locales (Simulador)
      await this.localPrisma.latencyLog.deleteMany({
        where: { driverId: { startsWith: 'SIM_' } }
      });
      console.log('✅ [Cleanup] Local latency logs purged.');

      // 2. Borrar Telemetría y Eventos en Base de Datos de Aplicación
      await this.appPrisma.$transaction([
        this.appPrisma.playbackEvent.deleteMany({
            where: { isSimulated: true }
        }),
        this.appPrisma.analyticsEvent.deleteMany({
            where: { isSimulated: true }
        }),
        this.appPrisma.driverLocation.deleteMany({
            where: { isSimulated: true }
        }),
        this.appPrisma.subscription.deleteMany({
            where: { isSimulated: true }
        }),
        this.appPrisma.device.deleteMany({
            where: { isSimulated: true }
        }),
        this.appPrisma.driver.deleteMany({
            where: { isSimulated: true }
        })
      ]);
      console.log('✅ [Cleanup] Application simulation telemetry, events, devices, and drivers purged.');
      
      // 3. Refrescar Vistas Materializadas para limpiar el dashboard Admin
      await this.appPrisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health');
      console.log('✅ [Cleanup] Fleet health materialized view refreshed.');
      
      return { success: true, message: 'Simulation data completely nuked.' };
    } catch (error: any) {
      console.error('❌ [Cleanup] Failed to purge simulation data:', error.message);
      return { success: false, error: error.message };
    } finally {
      await this.appPrisma.$disconnect();
      await this.localPrisma.$disconnect();
    }
  }
}
