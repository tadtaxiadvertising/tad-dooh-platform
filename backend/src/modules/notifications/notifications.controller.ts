import { Controller, Get, Put, Param, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get('unread-count')
  getUnreadCount() {
    return this.notificationsService.getUnreadCount();
  }

  @Post('mark-all-read')
  markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('test-alert')
  async createTestAlert(@Body() body: { title: string; message: string; type: any; category: any }) {
    return this.notificationsService.createAlert({
        title: body.title || 'Alerta de Prueba',
        message: body.message || 'Esta es un mensaje de prueba desde el sistema',
        type: body.type || 'INFO',
        category: body.category || 'SYSTEM',
    });
  }
}
