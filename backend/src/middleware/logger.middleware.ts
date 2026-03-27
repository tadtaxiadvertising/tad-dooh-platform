import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, body } = req;
    
    // We log the device ID if present in the payload
    const deviceId = body?.device_id || '-';

    res.on('finish', () => {
      const { statusCode } = res;
      const logLevel = statusCode >= 400 ? 'error' : 'log';
      this.logger[logLevel](`${method} ${originalUrl} ${statusCode}`, { 
        deviceId, 
        method, 
        url: originalUrl, 
        statusCode 
      });
    });

    next();
  }
}
