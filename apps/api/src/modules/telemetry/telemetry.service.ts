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

    await this.prisma.telemetry.createMany({
      data: telemetryData,
      skipDuplicates: true,
    });
  }
}
