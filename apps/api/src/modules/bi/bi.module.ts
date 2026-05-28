import { Module } from '@nestjs/common';
import { BiController } from './bi.controller';
import { BiService } from './bi.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BiScheduler } from './bi.scheduler';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BiController],
  providers: [BiService, BiScheduler],
  exports: [BiService],
})
export class BiModule {}
