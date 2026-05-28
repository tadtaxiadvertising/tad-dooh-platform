import { MiddlewareConsumer, NestModule, OnModuleInit } from '@nestjs/common';
import { AuthService } from './modules/auth/auth.service';
export declare class AppModule implements NestModule, OnModuleInit {
    private readonly authService;
    private readonly logger;
    constructor(authService: AuthService);
    configure(consumer: MiddlewareConsumer): void;
    onModuleInit(): Promise<void>;
}
