import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

export function isPrismaClientKnownError(
  e: unknown,
): e is Prisma.PrismaClientKnownRequestError {
  return (
    e instanceof Error &&
    Object.prototype.hasOwnProperty.call(e, "code") &&
    "code" in e &&
    typeof e.code === "string"
  );
}

export function isPrismaClientValidationError(
  e: unknown,
): e is Prisma.PrismaClientValidationError {
  return (
    e instanceof Error && Object.prototype.hasOwnProperty.call(e, "validation")
  );
}

@Catch()
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Error interno de base de datos.";
    let errorCode = "UNKNOWN";

    if (isPrismaClientKnownError(exception)) {
      this.logger.error(
        `Prisma Known Error [${exception.code}]: ${exception.message}`,
      );
      errorCode = exception.code;

      switch (exception.code) {
        case "P2000": {
          status = HttpStatus.BAD_REQUEST;
          const field = (exception.meta?.column_name as string) || "campo";
          message = `Valor demasiado largo para: ${field}.`;
          break;
        }
        case "P2001": {
          status = HttpStatus.NOT_FOUND;
          message = "Registro no encontrado para la operación solicitada.";
          break;
        }
        case "P2002": {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[]) || [];
          message = `Ya existe un registro con este/a: ${target.join(", ")}.`;
          break;
        }
        case "P2003": {
          status = HttpStatus.BAD_REQUEST;
          message = `Error de relación: verifique que el ID vinculado exista.`;
          break;
        }
        case "P2004": {
          status = HttpStatus.BAD_REQUEST;
          message = "Error de restricción en la base de datos.";
          break;
        }
        case "P2011": {
          status = HttpStatus.BAD_REQUEST;
          const field = (exception.meta?.field as string) || "campo";
          message = `Campo obligatorio faltante: ${field}.`;
          break;
        }
        case "P2014": {
          status = HttpStatus.BAD_REQUEST;
          message = "Error de relación: el registro referenciado no existe.";
          break;
        }
        case "P2025": {
          status = HttpStatus.NOT_FOUND;
          message = "Registro no encontrado.";
          break;
        }
        default: {
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = `Error de base de datos: ${exception.code}.`;
        }
      }
    } else if (isPrismaClientValidationError(exception)) {
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else {
      // No es error de Prisma: log y deja que GlobalExceptionFilter lo maneje
      this.logger.error("Non-Prisma exception in Prisma filter", exception);
      throw exception;
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      error:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? "Internal Server Error"
          : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
