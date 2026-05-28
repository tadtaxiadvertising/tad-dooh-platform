import { SystemSettingsService } from './system-settings.service';
export declare class SystemSettingsController {
    private readonly settingsService;
    constructor(settingsService: SystemSettingsService);
    getSettings(): Promise<Record<string, any>>;
    updateSettings(settings: Record<string, any>): Promise<Record<string, any>>;
}
