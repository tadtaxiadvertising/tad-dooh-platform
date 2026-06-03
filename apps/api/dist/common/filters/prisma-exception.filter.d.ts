import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
export declare class PrismaClientExceptionFilter implements ExceptionFilter {
    private readonly logger;
    catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError | Prisma.PrismaClientValidationError | Prisma.PrismaClientInitializationError, host: ArgumentsHost): void;
}
