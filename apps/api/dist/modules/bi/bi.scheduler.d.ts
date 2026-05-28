import { BiService } from './bi.service';
export declare class BiScheduler {
    private readonly biService;
    private readonly logger;
    constructor(biService: BiService);
    handleDailySnapshot(): Promise<void>;
    handleReconciliation(): Promise<void>;
}
