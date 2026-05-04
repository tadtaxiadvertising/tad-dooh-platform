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
      this.logger.log(`✅ Batch sync completed: ${telemetryData.length} points processed.`);
    } catch (err) {
      this.logger.error('Failed to batch sync telemetry', err);
    }
  }

  /**
   * REVENUE SHIELD: Registra una reproducción de video (Impacto)
   */
  async recordPlayback(data: {
    deviceId: string;
    videoId: string;
    eventType: 'START' | 'END' | 'ERROR';
    lat?: number;
    lng?: number;
  }) {
    try {
      return await this.prisma.playbackEvent.create({
        data: {
          deviceId: data.deviceId,
          videoId: data.videoId,
          eventType: data.eventType,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record playback event for device ${data.deviceId}`, err);
      throw err;
    }
  }
}
