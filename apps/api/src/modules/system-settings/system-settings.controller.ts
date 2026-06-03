import { Controller, Get, Body, Put, UseGuards } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@Controller('system-settings')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async updateSettings(@Body() settings: Record<string, any>) {
    return this.settingsService.updateMany(settings);
  }
}
