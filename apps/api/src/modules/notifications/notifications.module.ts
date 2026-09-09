import { Module, Global } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { WhatsAppService } from "./whatsapp.service";
import { EmailService } from "./email.service";
import { NotificationsController } from "./notifications.controller";

// NOTE: NotificationsProcessor removed — BullMQ/Redis not yet provisioned on EasyPanel.
// Re-add when REDIS_URL is configured: import { BullModule } from '@nestjs/bull'
// and add BullModule.registerQueue({ name: 'notifications' }) to imports.

@Global()
@Module({
  imports: [],
  providers: [NotificationsService, WhatsAppService, EmailService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsAppService, EmailService],
})
export class NotificationsModule {}
