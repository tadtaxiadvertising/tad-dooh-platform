// backend/src/campaigns/campaigns.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCampaignIntentDto } from './dto/create-campaign-intent.dto';

const prisma = new PrismaClient();

@Injectable()
export class CampaignsService {
  async createIntent(dto: CreateCampaignIntentDto) {
    try {
      const intent = await prisma.campaignIntent.create({
        data: {
          brandName: dto.brandName,
          budget: dto.budget,
          expectedScreens: dto.expectedScreens,
          fileMetadata: dto.fileMetadata || {},
          status: 'PENDING_PAYMENT',
        },
      });
      return { success: true, data: intent };
    } catch (error) {
      console.error('Error creating campaign intent:', error);
      throw new Error('No se pudo registrar la intención de campaña.');
    }
  }
}
