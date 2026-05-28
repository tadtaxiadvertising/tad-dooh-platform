"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWinstonLogger = void 0;
const nest_winston_1 = require("nest-winston");
const winston = require("winston");
const createWinstonLogger = () => {
    const customTransports = [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.timestamp(), winston.format.ms(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, ms, ...meta }) => {
                const ctx = context ? `[${context}] ` : '';
                return `${timestamp} ${level}: ${ctx}${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''} ${ms}`;
            })),
        }),
    ];
    const betterstackToken = process.env.BETTERSTACK_TOKEN?.trim();
    if (betterstackToken && betterstackToken.length > 10) {
        try {
            const { Logtail } = require('@logtail/node');
            const { LogtailTransport } = require('@logtail/winston');
            const logtail = new Logtail(betterstackToken);
            logtail.on('error', () => { });
            const logtailTransport = new LogtailTransport(logtail);
            logtailTransport.on('error', () => { });
            customTransports.push(logtailTransport);
        }
        catch {
        }
    }
    return nest_winston_1.WinstonModule.createLogger({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transports: customTransports,
    });
};
exports.createWinstonLogger = createWinstonLogger;
//# sourceMappingURL=winston.logger.js.map