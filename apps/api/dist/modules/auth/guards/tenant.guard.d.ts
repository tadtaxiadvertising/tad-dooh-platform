import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class TenantGuard implements CanActivate {
    private readonly logger;
    canActivate(context: ExecutionContext): boolean;
}
