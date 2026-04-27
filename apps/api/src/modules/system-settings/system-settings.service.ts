import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async getAll() {
    // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
    const settings = await this.prisma.systemSetting.findMany();
    return settings.reduce((acc, curr) => {
      let value: any = curr.value;
      if (curr.type === 'NUMBER') value = Number(curr.value);
      if (curr.type === 'BOOLEAN') value = curr.value === 'true';
      if (curr.type === 'JSON') {
        try {
          value = JSON.parse(curr.value);
        } catch (e) {
          value = curr.value;
        }
      }
      acc[curr.key] = value;
      return acc;
    }, {} as Record<string, any>);
  }

  async updateMany(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(async ([key, value]) => {
      // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
      const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
      if (existing) {
        let stringValue = String(value);
        if (existing.type === 'JSON') stringValue = JSON.stringify(value);
        
        // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
        return this.prisma.systemSetting.update({
          where: { key },
          data: { value: stringValue },
        });
      }
    });

    await Promise.all(updates.filter(Boolean));
    return this.getAll();
  }

  private async seedDefaults() {
    const defaults = [
      { key: 'platformName', value: 'TAD DOOH Platform', type: 'STRING', group: 'GENERAL' },
      { key: 'maintenanceMode', value: 'false', type: 'BOOLEAN', group: 'GENERAL' },
      { key: 'slotPrice', value: '500', type: 'NUMBER', group: 'FINANCIAL' },
      { key: 'referralFee', value: '500', type: 'NUMBER', group: 'FINANCIAL' },
      { key: 'subscriptionPrice', value: '6000', type: 'NUMBER', group: 'FINANCIAL' },
      { key: 'maxSlots', value: '15', type: 'NUMBER', group: 'FLEET' },
      { key: 'syncInterval', value: '10', type: 'NUMBER', group: 'FLEET' },
      { key: 'telemetryBatch', value: '50', type: 'NUMBER', group: 'FLEET' },
      { key: 'offlineLimit', value: '48', type: 'NUMBER', group: 'FLEET' },
      { key: 'remotionUrl', value: 'https://tad-remotion.rewvid.easypanel.host', type: 'STRING', group: 'SYSTEM' },
      { key: 'whatsappGateway', value: 'https://api.whatsapp.com/send', type: 'STRING', group: 'SYSTEM' },
    ];

    for (const setting of defaults) {
      // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
  }
}
