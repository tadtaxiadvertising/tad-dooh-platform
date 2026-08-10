import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SocialAgentService } from './social-agent.service';
import { SocialAgentController } from './social-agent.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
  ],
  controllers: [SocialAgentController],
  providers: [SocialAgentService],
  exports: [SocialAgentService],
})
export class SocialAgentModule {}
