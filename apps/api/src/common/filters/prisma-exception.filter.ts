import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientInitializationError
)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception: 
      | Prisma.PrismaClientKnownRequestError 
      | Prisma.PrismaClientUnknownRequestError 
      | Prisma.PrismaClientValidationError 
      | Prisma.PrismaClientInitializationError, 
    host: ArgumentsHost
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno de base de datos.';
    let errorCode = 'UNKNOWN';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`Prisma Known Error [${exception.code}]: ${exception.message}`);
      errorCode = exception.code;
      
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[]) || [];
          message = `Ya existe un registro con este/a: ${target.join(', ')}.`;
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = `Error de relación: Verifique que el ID vinculado exista (ej: ID Tablet).`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Registro no encontrado.';
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      message = 'Error de validación de datos: Verifique el formato de fechas o IDs.';
      errorCode = 'VALIDATION_ERROR';
    } else {
      this.logger.error(`Prisma Unhandled Error: ${exception.message}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
