import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { BullModule } from '@nestjs/bull';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationsService, WhatsAppService, EmailService, NotificationsProcessor],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsAppService, EmailService],
})
export class NotificationsModule {}
