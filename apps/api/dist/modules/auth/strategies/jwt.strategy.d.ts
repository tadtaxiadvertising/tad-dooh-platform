import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly supabaseService;
    constructor(configService: ConfigService, supabaseService: SupabaseService);
    validate(req: any, payload: any): Promise<{
        id: string;
        email: string;
        role: any;
        entityId: any;
    }>;
}
export {};
