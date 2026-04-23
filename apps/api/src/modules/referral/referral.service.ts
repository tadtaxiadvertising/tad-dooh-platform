import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true }
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const code = driver.referralCode;
    const url = `https://tad-advertiser.rewvid.easypanel.host/register?ref=${code}`;
    
    return {
      driverId,
      referralCode: code,
      url,
      qrPayload: url
    };
  }
}
