import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
}
