interface ApiStatusResponse {
    status: 'UP';
    timestamp: string;
    service: string;
    version: string;
    routes: {
        health: string[];
        api: string;
        docs: string;
    };
}
export declare class AppController {
    private getStatus;
    getRoot(): ApiStatusResponse;
    getHealth(): ApiStatusResponse;
}
export {};
