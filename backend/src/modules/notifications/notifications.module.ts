import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  providers: [NotificationsService, WhatsAppService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsAppService],
})
export class NotificationsModule {}
