import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
export declare class SubscriptionGuard implements CanActivate {
    private readonly prisma;
    private readonly logger;
    private static readonly GRACE_PERIOD_MS;
    private static readonly OFFLINE_THRESHOLD_MS;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
