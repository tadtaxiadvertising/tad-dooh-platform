import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = exceptionResponse.message || exception.message;
        code = exceptionResponse.code || this.mapStatusToCode(status, message);
      } else {
        message = exception.message;
        code = this.mapStatusToCode(status, message);
      }
    } else if (exception instanceof Error) {
      if (exception.message.includes('NETWORK_OFFLINE')) {
        status = HttpStatus.GATEWAY_TIMEOUT; 
        code = 'NETWORK_OFFLINE';
      } else if (exception.message.includes('DEVICE_NOT_FOUND')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DEVICE_NOT_FOUND';
      }
    }

    // Do not return stack trace, standardized error response
    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapStatusToCode(status: number, message: string): string {
    if (status === 401) return 'AUTH_EXPIRED';
    if (status === 400 && message.toLowerCase().includes('insufficient')) return 'FUNDS_ERROR';
    if (status === 400) return 'BAD_REQUEST';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 503) return 'SERVICE_UNAVAILABLE';
    return 'INTERNAL_ERROR';
  }
}
