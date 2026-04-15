import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

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
    }),
  ];

  // BetterStack / Logtail Integration — Only enabled when valid token is present
  const betterstackToken = process.env.BETTERSTACK_TOKEN?.trim();
  if (betterstackToken && betterstackToken.length > 10) {
    try {
      // Dynamic import so missing token does NOT crash the logger
      const { Logtail } = require('@logtail/node');
      const { LogtailTransport } = require('@logtail/winston');
      const logtail = new Logtail(betterstackToken);

      // Silence "Unauthorized" errors from logtail — prevents log spam when token is wrong
      logtail.on('error', () => { /* Intentionally silenced */ });

      const logtailTransport = new LogtailTransport(logtail);

      // Catch transport-level errors to avoid uncaught rejections
      logtailTransport.on('error', () => { /* Intentionally silenced */ });

      customTransports.push(logtailTransport);
    } catch {
      // If @logtail is not installed or fails to init, we continue without it
    }
  }

  return WinstonModule.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transports: customTransports,
  });
};
