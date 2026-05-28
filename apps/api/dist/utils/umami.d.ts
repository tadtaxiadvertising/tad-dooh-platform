export declare class UmamiClient {
    private readonly baseUrl;
    private readonly apiToken;
    constructor(apiToken: string, baseUrl?: string);
    private request;
    getWebsites(): Promise<any>;
    getWebsiteStats(websiteId: string, startAt: number, endAt: number): Promise<any>;
    getPageViews(websiteId: string, startAt: number, endAt: number, unit?: string): Promise<any>;
}
export declare const createUmamiClient: () => UmamiClient;
