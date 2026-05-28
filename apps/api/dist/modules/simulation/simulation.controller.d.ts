import { SimulationService, ScenarioConfig } from './simulation.service';
export declare class SimulationController {
    private readonly simService;
    constructor(simService: SimulationService);
    getState(): Promise<{
        success: boolean;
        data: {
            isRunning: boolean;
            currentScenario: ScenarioConfig;
            fleetCount: number;
        };
    }>;
    startScenario(config: Partial<ScenarioConfig>): Promise<{
        success: boolean;
        message: string;
    }>;
    stop(): Promise<{
        success: boolean;
        message: string;
    }>;
    stopAndPurge(): Promise<{
        success: boolean;
        message: string;
    }>;
}
