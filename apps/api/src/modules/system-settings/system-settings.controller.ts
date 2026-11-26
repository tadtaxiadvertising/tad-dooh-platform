import { Controller, Get, Body, Put } from "@nestjs/common";
import { SystemSettingsService } from "./system-settings.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("system-settings")
// Authentication and RBAC run through AppModule's global guards. A local
// duplicate would require auth-domain providers in this settings module.
export class SystemSettingsController {
  constructor(private readonly settingsService: SystemSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async updateSettings(@Body() settings: Record<string, unknown>) {
    return this.settingsService.updateMany(settings);
  }
}
