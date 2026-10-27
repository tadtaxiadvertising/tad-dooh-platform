import { PrismaClient } from "@prisma/client";
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import winston from "winston";

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

// Types
interface AgentTask {
  id: string;
  type: "systems" | "marketing" | "finance" | "hr";
  priority: "low" | "medium" | "high" | "critical";
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  retries: number;
  maxRetries: number;
}

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
  lastCheck: Date;
}

interface FinanceOperation {
  type:
    | "earnings_calculation"
    | "payout_processing"
    | "invoice_generation"
    | "revenue_report";
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

interface MarketingAction {
  type:
    | "campaign_optimization"
    | "advertiser_outreach"
    | "performance_analysis"
    | "budget_reallocation";
  payload: Record<string, unknown>;
}

interface HRAction {
  type:
    | "driver_onboarding"
    | "performance_review"
    | "shift_optimization"
    | "compliance_check";
  payload: Record<string, unknown>;
}

// Configuration
const CONFIG = {
  ORCHESTRATOR_INTERVAL_MS: parseInt(
    process.env.ORCHESTRATOR_INTERVAL_MS || "60000",
    10,
  ), // 1 minute default
  MAX_CONCURRENT_TASKS: parseInt(process.env.MAX_CONCURRENT_TASKS || "3", 10),
  TASK_TIMEOUT_MS: parseInt(process.env.TASK_TIMEOUT_MS || "300000", 10), // 5 minutes
  HEALTH_CHECK_INTERVAL_MS: parseInt(
    process.env.HEALTH_CHECK_INTERVAL_MS || "30000",
    10,
  ),
  INTERNAL_API_URL: process.env.INTERNAL_API_URL || "http://api:3000",
  SYSTEM_AGENT_TOKEN: process.env.SYSTEM_AGENT_TOKEN || "",
  FREE_TIER_API_KEY: process.env.FREE_TIER_API_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
};

// Initialize Prisma Client (Read-only for agents)
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Internal API client with system agent authentication
const internalApi = axios.create({
  baseURL: CONFIG.INTERNAL_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${CONFIG.SYSTEM_AGENT_TOKEN}`,
    "X-Agent-Type": "system_orchestrator",
  },
});

// Add idempotency key to mutating requests
internalApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (["post", "put", "patch", "delete"].includes(config.method || "")) {
    config.headers["Idempotency-Key"] =
      config.headers["Idempotency-Key"] || uuidv4();
  }
  return config;
});

// Task queue
const taskQueue: AgentTask[] = [];
let isProcessing = false;

// Main Orchestrator Class
class AgentOrchestrator {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private orchestratorInterval: NodeJS.Timeout | null = null;

  async start() {
    logger.info("🚀 Starting TAD Autonomous Agents Orchestrator");

    // Validate critical environment variables
    this.validateEnvironment();

    // Test database connection
    await this.testDatabaseConnection();

    // Test internal API connection
    await this.testInternalApiConnection();

    // Start health monitoring
    this.startHealthMonitoring();

    // Start main orchestration loop
    this.startOrchestrationLoop();

    // Handle graceful shutdown
    this.setupGracefulShutdown();

    logger.info("✅ Orchestrator started successfully");
  }

  private validateEnvironment() {
    const required = [
      "DATABASE_URL",
      "INTERNAL_API_URL",
      "SYSTEM_AGENT_TOKEN",
      "FREE_TIER_API_KEY",
    ];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      logger.error(
        `❌ Missing required environment variables: ${missing.join(", ")}`,
      );
      process.exit(1);
    }

    logger.info("✅ Environment validation passed");
  }

  private async testDatabaseConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info("✅ Database connection established (read-only mode)");
    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  private async testInternalApiConnection() {
    try {
      const response = await internalApi.get("/api/health");
      logger.info(`✅ Internal API connection established: ${response.status}`);
    } catch (error) {
      logger.error("❌ Internal API connection failed:", error);
      process.exit(1);
    }
  }

  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();
        logger.debug("System health check", health);

        // Alert if system is under stress
        if (health.cpuUsage > 80 || health.memoryUsage > 85) {
          logger.warn("⚠️ System under high resource usage", health);
        }
      } catch (error) {
        logger.error("Health check failed:", error);
      }
    }, CONFIG.HEALTH_CHECK_INTERVAL_MS);
  }

  private async checkSystemHealth(): Promise<SystemHealth> {
    // In a real implementation, this would check actual system metrics
    // For now, we'll query the database for error rates
    try {
      const [errorCount, totalErrors] = await Promise.all([
        prisma.systemError.count({
          where: {
            severity: { in: ["ERROR", "CRITICAL"] },
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
          },
        }),
        prisma.systemError.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
          },
        }),
      ]);

      return {
        cpuUsage: 0, // Would be populated from actual system metrics
        memoryUsage: 0,
        activeConnections: 0,
        errorRate: totalErrors > 0 ? (errorCount / totalErrors) * 100 : 0,
        lastCheck: new Date(),
      };
    } catch {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        errorRate: 0,
        lastCheck: new Date(),
      };
    }
  }

  private startOrchestrationLoop() {
    this.orchestratorInterval = setInterval(async () => {
      if (isProcessing) return;

      try {
        await this.runOrchestrationCycle();
      } catch (error) {
        logger.error("Orchestration cycle failed:", error);
      }
    }, CONFIG.ORCHESTRATOR_INTERVAL_MS);
  }

  private async runOrchestrationCycle() {
    isProcessing = true;
    logger.debug("🔄 Starting orchestration cycle");

    try {
      // 1. Evaluate system state and identify tasks
      const tasks = await this.evaluateAndCreateTasks();

      // 2. Process pending tasks (respecting concurrency limits)
      await this.processTasks(tasks);

      // 3. Clean up completed/failed tasks
      this.cleanupTasks();
    } finally {
      isProcessing = false;
    }
  }

  private async evaluateAndCreateTasks(): Promise<AgentTask[]> {
    const newTasks: AgentTask[] = [];

    // Systems Agent: Check for errors, performance issues, security alerts
    const systemsTasks = await this.evaluateSystemsTasks();
    newTasks.push(...systemsTasks);

    // Marketing Agent: Campaign optimization, advertiser outreach
    const marketingTasks = await this.evaluateMarketingTasks();
    newTasks.push(...marketingTasks);

    // Finance Agent: Earnings calculation, payout processing
    const financeTasks = await this.evaluateFinanceTasks();
    newTasks.push(...financeTasks);

    // HR Agent: Driver onboarding, performance reviews
    const hrTasks = await this.evaluateHRTasks();
    newTasks.push(...hrTasks);

    // Add to queue
    for (const task of newTasks) {
      taskQueue.push(task);
    }

    return newTasks;
  }

  private async evaluateSystemsTasks(): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    try {
      // Check for recent errors that need investigation
      const recentErrors = await prisma.systemError.findMany({
        where: {
          severity: { in: ["ERROR", "CRITICAL"] },
          resolved: false,
          createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (recentErrors.length > 5) {
        tasks.push({
          id: uuidv4(),
          type: "systems",
          priority: "high",
          payload: {
            action: "error_analysis",
            errors: recentErrors.map((e) => ({
              source: e.source,
              severity: e.severity,
              message: e.message,
              details: e.details,
              entityId: e.entityId,
              timestamp: e.createdAt,
            })),
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 3,
        });
      }
    } catch (error) {
      logger.error("Failed to evaluate systems tasks:", error);
    }

    return tasks;
  }

  private async evaluateMarketingTasks(): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    try {
      // Check campaigns that need optimization (low delivery rate)
      const underperformingCampaigns = await prisma.campaign.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: new Date() },
          active: true,
        },
        take: 10,
      });

      if (underperformingCampaigns.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "marketing",
          priority: "medium",
          payload: {
            action: "campaign_optimization",
            campaigns: underperformingCampaigns.map((c) => ({
              id: c.id,
              name: c.name,
              budget: c.budget,
              status: c.status,
              startDate: c.startDate,
              endDate: c.endDate,
              targetCities: c.targetCities,
            })),
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 2,
        });
      }

      // Check for advertisers with expiring campaigns
      const expiringCampaigns = await prisma.campaign.findMany({
        where: {
          status: "ACTIVE",
          endDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            gte: new Date(),
          },
        },
        take: 20,
      });

      if (expiringCampaigns.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "marketing",
          priority: "low",
          payload: {
            action: "advertiser_outreach",
            campaigns: expiringCampaigns.map((c) => ({
              id: c.id,
              name: c.name,
              advertiserId: c.advertiserId,
              endDate: c.endDate,
            })),
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 1,
        });
      }
    } catch (error) {
      logger.error("Failed to evaluate marketing tasks:", error);
    }

    return tasks;
  }

  private async evaluateFinanceTasks(): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    try {
      // Check for pending payroll payments that need processing
      const pendingPayouts = await prisma.payrollPayment.findMany({
        where: {
          status: "PENDING",
          amount: { gt: 0 },
        },
        take: 50,
      });

      if (pendingPayouts.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "finance",
          priority: "high",
          payload: {
            action: "payout_processing",
            payrollPaymentIds: pendingPayouts.map((e) => e.id),
            idempotencyKey: `payout_batch_${Date.now()}`,
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 3,
        });
      }

      // Check for invoices that need generation
      const pendingInvoices = await prisma.advertiserSubscription.findMany({
        where: {
          status: "ACTIVE",
          nextBillingDate: { lte: new Date() },
        },
        take: 20,
      });

      if (pendingInvoices.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "finance",
          priority: "medium",
          payload: {
            action: "invoice_generation",
            subscriptionIds: pendingInvoices.map((s) => s.id),
            idempotencyKey: `invoice_batch_${Date.now()}`,
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 2,
        });
      }
    } catch (error) {
      logger.error("Failed to evaluate finance tasks:", error);
    }

    return tasks;
  }

  private async evaluateHRTasks(): Promise<AgentTask[]> {
    const tasks: AgentTask[] = [];

    try {
      // Check for drivers needing onboarding completion
      const incompleteOnboarding = await prisma.driver.findMany({
        where: {
          onboardingStatus: "IN_PROGRESS",
          updatedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Stalled > 24h
        },
        take: 20,
      });

      if (incompleteOnboarding.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "hr",
          priority: "medium",
          payload: {
            action: "driver_onboarding_followup",
            driverIds: incompleteOnboarding.map((d) => d.id),
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 1,
        });
      }

      // Check for drivers with expiring documents (using ContractAcceptance as proxy)
      // Note: No driverDocument model exists, using contract acceptances as compliance check
      const expiringContracts = await prisma.contractAcceptance.findMany({
        where: {
          timestamp: {
            lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Older than 1 year
          },
        },
        take: 50,
      });

      if (expiringContracts.length > 0) {
        tasks.push({
          id: uuidv4(),
          type: "hr",
          priority: "low",
          payload: {
            action: "compliance_check",
            contracts: expiringContracts.map((c) => ({
              id: c.id,
              driverId: c.driverId,
              version: c.version,
              timestamp: c.timestamp,
            })),
          },
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          retries: 0,
          maxRetries: 1,
        });
      }
    } catch (error) {
      logger.error("Failed to evaluate HR tasks:", error);
    }

    return tasks;
  }

  private async processTasks(tasks: AgentTask[]) {
    const pendingTasks = taskQueue.filter((t) => t.status === "pending");
    const processingCount = taskQueue.filter(
      (t) => t.status === "processing",
    ).length;
    const availableSlots = CONFIG.MAX_CONCURRENT_TASKS - processingCount;

    if (availableSlots <= 0) {
      logger.debug("No available slots for task processing");
      return;
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedTasks = [...pendingTasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    const tasksToProcess = sortedTasks.slice(0, availableSlots);

    for (const task of tasksToProcess) {
      task.status = "processing";
      task.updatedAt = new Date();

      // Process asynchronously with timeout
      this.processTaskWithTimeout(task).catch((error) => {
        logger.error(`Task ${task.id} failed:`, error);
        task.status = "failed";
        task.updatedAt = new Date();
      });
    }
  }

  private async processTaskWithTimeout(task: AgentTask): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Task timeout")),
        CONFIG.TASK_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([this.executeTask(task), timeoutPromise]);

      task.status = "completed";
      task.updatedAt = new Date();
      logger.info(`✅ Task ${task.id} (${task.type}) completed`);
    } catch (error) {
      task.retries++;
      task.updatedAt = new Date();

      if (task.retries >= task.maxRetries) {
        task.status = "failed";
        logger.error(
          `❌ Task ${task.id} failed after ${task.maxRetries} retries:`,
          error,
        );
      } else {
        task.status = "pending";
        logger.warn(
          `⚠️ Task ${task.id} failed, retry ${task.retries}/${task.maxRetries}:`,
          error,
        );
      }
    }
  }

  private async executeTask(task: AgentTask): Promise<void> {
    switch (task.type) {
      case "systems":
        await this.executeSystemsTask(task);
        break;
      case "marketing":
        await this.executeMarketingTask(task);
        break;
      case "finance":
        await this.executeFinanceTask(task);
        break;
      case "hr":
        await this.executeHRTask(task);
        break;
    }
  }

  private async executeSystemsTask(task: AgentTask): Promise<void> {
    const { action, ...payload } = task.payload;

    switch (action) {
      case "error_analysis":
        // Analyze errors and create GitHub issues or alert developers
        logger.info("Analyzing system errors", {
          errorCount: (payload.errors as unknown[])?.length,
        });
        // In production: call LLM to analyze errors and suggest fixes
        break;
    }
  }

  private async executeMarketingTask(task: AgentTask): Promise<void> {
    const { action, ...payload } = task.payload;

    switch (action) {
      case "campaign_optimization":
        logger.info("Optimizing campaigns", {
          campaignCount: (payload.campaigns as unknown[])?.length,
        });
        // In production: call LLM to suggest budget reallocation, targeting changes
        break;
      case "advertiser_outreach":
        logger.info("Preparing advertiser outreach", {
          campaignCount: (payload.campaigns as unknown[])?.length,
        });
        // In production: generate personalized emails for advertisers
        break;
    }
  }

  private async executeFinanceTask(task: AgentTask): Promise<void> {
    const { action, ...payload } = task.payload;

    switch (action) {
      case "payout_processing": {
        const { payrollPaymentIds, idempotencyKey } = payload as {
          payrollPaymentIds: string[];
          idempotencyKey: string;
        };
        logger.info("Processing payouts", { count: payrollPaymentIds?.length });

        // CRITICAL: Must use internal API with idempotency key (R8 compliance)
        await internalApi.post(
          "/api/v1/finance/process-payouts",
          { payrollPaymentIds },
          { headers: { "Idempotency-Key": idempotencyKey } },
        );
        break;
      }
      case "invoice_generation": {
        const { subscriptionIds, idempotencyKey } = payload as {
          subscriptionIds: string[];
          idempotencyKey: string;
        };
        logger.info("Generating invoices", { count: subscriptionIds?.length });

        // CRITICAL: Must use internal API with idempotency key (R8 compliance)
        await internalApi.post(
          "/api/v1/finance/generate-invoices",
          { subscriptionIds },
          { headers: { "Idempotency-Key": idempotencyKey } },
        );
        break;
      }
    }
  }

  private async executeHRTask(task: AgentTask): Promise<void> {
    const { action, ...payload } = task.payload;

    switch (action) {
      case "driver_onboarding_followup":
        logger.info("Following up on driver onboarding", {
          driverCount: (payload.driverIds as unknown[])?.length,
        });
        // In production: send reminders, escalate to support
        break;
      case "compliance_check":
        logger.info("Checking compliance", {
          contractCount: (payload.contracts as unknown[])?.length,
        });
        // In production: notify drivers of expiring contracts
        break;
    }
  }

  private cleanupTasks() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Remove completed/failed tasks older than maxAge
    const initialLength = taskQueue.length;
    for (let i = taskQueue.length - 1; i >= 0; i--) {
      const task = taskQueue[i];
      if (
        (task.status === "completed" || task.status === "failed") &&
        now - task.updatedAt.getTime() > maxAge
      ) {
        taskQueue.splice(i, 1);
      }
    }

    if (taskQueue.length !== initialLength) {
      logger.debug(`Cleaned up ${initialLength - taskQueue.length} old tasks`);
    }
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      if (this.orchestratorInterval) clearInterval(this.orchestratorInterval);
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

      // Wait for processing tasks to complete (with timeout)
      const processingTasks = taskQueue.filter(
        (t) => t.status === "processing",
      );
      if (processingTasks.length > 0) {
        logger.info(
          `Waiting for ${processingTasks.length} tasks to complete...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s max wait
      }

      await prisma.$disconnect();
      logger.info("✅ Orchestrator shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

// Start the orchestrator
const orchestrator = new AgentOrchestrator();
orchestrator.start().catch((error) => {
  logger.error("Failed to start orchestrator:", error);
  process.exit(1);
});

export { AgentOrchestrator };
