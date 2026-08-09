declare class AgentOrchestrator {
    private healthCheckInterval;
    private orchestratorInterval;
    start(): Promise<void>;
    private validateEnvironment;
    private testDatabaseConnection;
    private testInternalApiConnection;
    private startHealthMonitoring;
    private checkSystemHealth;
    private startOrchestrationLoop;
    private runOrchestrationCycle;
    private evaluateAndCreateTasks;
    private evaluateSystemsTasks;
    private evaluateMarketingTasks;
    private evaluateFinanceTasks;
    private evaluateHRTasks;
    private processTasks;
    private processTaskWithTimeout;
    private executeTask;
    private executeSystemsTask;
    private executeMarketingTask;
    private executeFinanceTask;
    private executeHRTask;
    private cleanupTasks;
    private setupGracefulShutdown;
}
export { AgentOrchestrator };
//# sourceMappingURL=main.d.ts.map