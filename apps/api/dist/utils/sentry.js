"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSentry = initializeSentry;
const Sentry = require("@sentry/nestjs");
const profiling_node_1 = require("@sentry/profiling-node");
function initializeSentry() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        console.warn('⚠️ Sentry DSN not provided. Sentry will NOT be initialized.');
        return;
    }
    Sentry.init({
        dsn,
        integrations: [
            (0, profiling_node_1.nodeProfilingIntegration)(),
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
    });
    console.log('🛡️ Sentry initialized successfully.');
}
//# sourceMappingURL=sentry.js.map