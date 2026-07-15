"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaClientExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClientExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaClientExceptionFilter = PrismaClientExceptionFilter_1 = class PrismaClientExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(PrismaClientExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno de base de datos.';
        let errorCode = 'UNKNOWN';
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            this.logger.error(`Prisma Known Error [${exception.code}]: ${exception.message}`);
            errorCode = exception.code;
            switch (exception.code) {
                case 'P2002':
                    status = common_1.HttpStatus.CONFLICT;
                    const target = exception.meta?.target || [];
                    message = `Ya existe un registro con este/a: ${target.join(', ')}.`;
                    break;
                case 'P2003':
                    status = common_1.HttpStatus.BAD_REQUEST;
                    message = `Error de relación: Verifique que el ID vinculado exista (ej: ID Tablet).`;
                    break;
                case 'P2025':
                    status = common_1.HttpStatus.NOT_FOUND;
                    message = 'Registro no encontrado.';
                    break;
            }
        }
        else if (exception instanceof client_1.Prisma.PrismaClientValidationError) {
            this.logger.error(`Prisma Validation Error: ${exception.message}`);
            status = common_1.HttpStatus.BAD_REQUEST;
            message = 'Error de validación de datos: Verifique el formato de fechas o IDs.';
            errorCode = 'VALIDATION_ERROR';
        }
        else {
            this.logger.error(`Prisma Unknown/Initialization Error: ${exception.message}`);
            message = exception.message;
            errorCode = 'DB_ERROR';
        }
        response.status(status).json({
            statusCode: status,
            message,
            errorCode,
            error: status === common_1.HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : undefined,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter;
exports.PrismaClientExceptionFilter = PrismaClientExceptionFilter = PrismaClientExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(client_1.Prisma.PrismaClientKnownRequestError, client_1.Prisma.PrismaClientUnknownRequestError, client_1.Prisma.PrismaClientValidationError, client_1.Prisma.PrismaClientInitializationError)
], PrismaClientExceptionFilter);
//# sourceMappingURL=prisma-exception.filter.js.map