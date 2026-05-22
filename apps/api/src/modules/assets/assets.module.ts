import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule.register({ timeout: 120_000 })],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
