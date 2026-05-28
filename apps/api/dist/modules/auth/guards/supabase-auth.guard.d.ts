import { ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
export declare class SupabaseAuthGuard implements CanActivate {
    private reflector;
    private supabaseService;
    private configService;
    private readonly logger;
    private readonly isDev;
    private readonly allowDevBypass;
    private static sessionCache;
    private readonly CACHE_TTL_MS;
    constructor(reflector: Reflector, supabaseService: SupabaseService, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
