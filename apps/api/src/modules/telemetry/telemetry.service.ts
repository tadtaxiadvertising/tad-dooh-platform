import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelemetryService {
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

    for (const item of telemetryData) {
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO telemetry (id, driver_id, coords, speed, timestamp) 
           VALUES (gen_random_uuid(), $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)`,
          item.driverId, item.longitude, item.latitude, item.speed, item.timestamp
        );
      } catch (err) {
        console.error('Failed to sync telemetry point', err);
      }
    }
  }
}
