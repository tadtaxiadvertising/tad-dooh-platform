"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message = 'An unexpected error occurred';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                message = exceptionResponse.message || exception.message;
                code = exceptionResponse.code || this.mapStatusToCode(status, message);
            }
            else {
                message = exception.message;
                code = this.mapStatusToCode(status, message);
            }
        }
        else if (exception instanceof Error) {
            if (exception.message.includes('NETWORK_OFFLINE')) {
                status = common_1.HttpStatus.GATEWAY_TIMEOUT;
                code = 'NETWORK_OFFLINE';
            }
            else if (exception.message.includes('DEVICE_NOT_FOUND')) {
                status = common_1.HttpStatus.SERVICE_UNAVAILABLE;
                code = 'DEVICE_NOT_FOUND';
            }
        }
        response.status(status).json({
            statusCode: status,
            code,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
    mapStatusToCode(status, message) {
        if (status === 401)
            return 'AUTH_EXPIRED';
        if (status === 400 && message.toLowerCase().includes('insufficient'))
            return 'FUNDS_ERROR';
        if (status === 400)
            return 'BAD_REQUEST';
        if (status === 403)
            return 'FORBIDDEN';
        if (status === 404)
            return 'NOT_FOUND';
        if (status === 503)
            return 'SERVICE_UNAVAILABLE';
        return 'INTERNAL_ERROR';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map