import { AssetsService } from './assets.service';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    getAssetManifest(deviceId: string): Promise<{
        manifest: {};
        version: number;
    }>;
    handleWebhook(payload: any): Promise<{
        received: boolean;
    }>;
}
