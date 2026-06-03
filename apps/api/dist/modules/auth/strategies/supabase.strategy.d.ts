import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
declare const SupabaseStrategy_base: new (...args: any[]) => Strategy;
export declare class SupabaseStrategy extends SupabaseStrategy_base {
    private readonly configService;
    constructor(configService: ConfigService);
    validate(payload: any): Promise<{
        id: any;
        email: any;
        role: any;
        entityId: any;
    }>;
}
export {};
