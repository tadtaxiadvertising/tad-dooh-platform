import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

export const createWinstonLogger = () => {
  const customTransports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ms, ...meta }) => {
          const ctx = context ? `[${context}] ` : '';
          return `${timestamp} ${level}: ${ctx}${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''} ${ms}`;
        }),
      ),
    })
  ];

  // Betterstack Integration
  const betterstackToken = process.env.BETTERSTACK_TOKEN;
  if (betterstackToken) {
    const logtail = new Logtail(betterstackToken);
    customTransports.push(new LogtailTransport(logtail));
  }

  return WinstonModule.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transports: customTransports,
  });
};
