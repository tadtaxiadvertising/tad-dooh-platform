import axios from 'axios';

export class UmamiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(apiToken: string, baseUrl: string = 'https://cloud.umami.is/api') {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  private async request(method: string, endpoint: string, params: any = {}) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Accept': 'application/json',
        },
        params,
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Umami API Error (${endpoint}):`, error.response?.data || error.message);
      return null;
    }
  }

  async getWebsites() {
    return this.request('get', '/websites');
  }

  async getWebsiteStats(websiteId: string, startAt: number, endAt: number) {
    return this.request('get', `/websites/${websiteId}/stats`, {
      startAt,
      endAt,
    });
  }

  async getPageViews(websiteId: string, startAt: number, endAt: number, unit: string = 'day') {
    return this.request('get', `/websites/${websiteId}/pageviews`, {
      startAt,
      endAt,
      unit,
    });
  }
}

export const createUmamiClient = () => {
  const token = process.env.UMAMI_API_TOKEN;
  if (!token) return null;
  return new UmamiClient(token);
};
