import { Module } from '@nestjs/common';
import { PortalRequestsService } from './portal-requests.service';
import { PortalRequestsController } from './portal-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PortalRequestsController],
  providers: [PortalRequestsService],
  exports: [PortalRequestsService],
})
export class PortalRequestsModule {}
