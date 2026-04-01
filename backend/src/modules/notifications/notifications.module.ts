import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  providers: [NotificationsService, WhatsAppService, EmailService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsAppService, EmailService],
})
export class NotificationsModule {}
