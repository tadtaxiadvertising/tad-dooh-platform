"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUmamiClient = exports.UmamiClient = void 0;
const axios_1 = require("axios");
class UmamiClient {
    constructor(apiToken, baseUrl = 'https://cloud.umami.is/api') {
        this.apiToken = apiToken;
        this.baseUrl = baseUrl;
    }
    async request(method, endpoint, params = {}) {
        try {
            const response = await (0, axios_1.default)({
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Accept': 'application/json',
                },
                params,
            });
            return response.data;
        }
        catch (error) {
            console.error(`❌ Umami API Error (${endpoint}):`, error.response?.data || error.message);
            return null;
        }
    }
    async getWebsites() {
        return this.request('get', '/websites');
    }
    async getWebsiteStats(websiteId, startAt, endAt) {
        return this.request('get', `/websites/${websiteId}/stats`, {
            startAt,
            endAt,
        });
    }
    async getPageViews(websiteId, startAt, endAt, unit = 'day') {
        return this.request('get', `/websites/${websiteId}/pageviews`, {
            startAt,
            endAt,
            unit,
        });
    }
}
exports.UmamiClient = UmamiClient;
const createUmamiClient = () => {
    const token = process.env.UMAMI_API_TOKEN;
    if (!token)
        return null;
    return new UmamiClient(token);
};
exports.createUmamiClient = createUmamiClient;
//# sourceMappingURL=umami.js.map