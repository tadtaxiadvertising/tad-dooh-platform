import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send-push')
  async handleSendPush(job: Job<{ driverId: string; message: string }>) {
    const { driverId, message } = job.data;
    this.logger.log(`🔄 Processing background push for driver ${driverId}`);
    
    // We call the actual sending logic here
    // In a real scenario, this would talk to Firebase/OneSignal
    return this.notificationsService.executePushDelivery(driverId, message);
  }
}
