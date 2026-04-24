import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async sync(data: any[]) {
    if (!data || data.length === 0) return;
    
    const telemetryData = data.map(item => ({
      driverId: item.driverId,
      latitude: item.lat,
      longitude: item.lng,
      speed: item.speed,
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    }));

    if (telemetryData.length === 0) return;

    try {
      const values = telemetryData.map((_, i) => 
        `(gen_random_uuid(), $${i * 5 + 1}, ST_SetSRID(ST_MakePoint($${i * 5 + 2}, $${i * 5 + 3}), 4326), $${i * 5 + 4}, $${i * 5 + 5})`
      ).join(', ');

      const params = telemetryData.flatMap(item => [
        item.driverId, item.longitude, item.latitude, item.speed, item.timestamp
      ]);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO telemetry (id, driver_id, coords, speed, timestamp) 
         VALUES ${values}
         ON CONFLICT (driver_id, timestamp) DO NOTHING`,
        ...params
      );
    } catch (err) {
      this.logger.error('Failed to batch sync telemetry', err);
      // Fallback to individual inserts if batch fails (e.g. one point is invalid)
      for (const item of telemetryData) {
        try {
          await this.prisma.$executeRawUnsafe(
            `INSERT INTO telemetry (id, driver_id, coords, speed, timestamp) 
             VALUES (gen_random_uuid(), $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)`,
            item.driverId, item.longitude, item.latitude, item.speed, item.timestamp
          );
        } catch (innerErr) {
          this.logger.error(`Individual fallback sync failed for driver ${item.driverId}`, innerErr);
        }
      }
    }
  }
}
