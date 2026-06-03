import { PrismaService } from '../prisma/prisma.service';
export interface ScenarioConfig {
    name: string;
    activeNodes: number;
    centerLat: number;
    centerLng: number;
    radiusKm: number;
    minSpeed: number;
    maxSpeed: number;
    anomalyRate: number;
}
export declare class SimulationService {
    private prisma;
    private readonly logger;
    private isRunning;
    private currentScenario;
    private fleetState;
    constructor(prisma: PrismaService);
    getState(): {
        isRunning: boolean;
        currentScenario: ScenarioConfig;
        fleetCount: number;
    };
    loadScenario(config: ScenarioConfig): Promise<void>;
    handleSimulationTick(): Promise<void>;
    stopSimulation(): Promise<{
        success: boolean;
    }>;
    clearTestData(): Promise<void>;
}
