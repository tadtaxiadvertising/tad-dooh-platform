import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { SimulationController } from "../simulation.controller";
import { SimulationService } from "../simulation.service";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";

describe("SimulationController Security & Authorization", () => {
  let controller: SimulationController;
  let service: SimulationService;
  const reflector = new Reflector();

  const mockSimulationService = {
    getState: jest.fn().mockReturnValue({
      isRunning: false,
      currentScenario: null,
      fleetCount: 0,
    }),
    loadScenario: jest.fn().mockResolvedValue(undefined),
    stopSimulation: jest.fn().mockResolvedValue({ success: true }),
    clearTestData: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [
        {
          provide: SimulationService,
          useValue: mockSimulationService,
        },
      ],
    }).compile();

    controller = module.get<SimulationController>(SimulationController);
    service = module.get<SimulationService>(SimulationService);
    jest.clearAllMocks();
  });

  describe("Security Metadata", () => {
    it("must NOT be marked with @Public() at controller level", () => {
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        SimulationController,
      );
      expect(isPublic).toBeFalsy();
    });

    it("must NOT have @Public() on any controller methods", () => {
      const methods = ["getState", "startScenario", "stop", "stopAndPurge"];
      for (const method of methods) {
        const isPublic = reflector.get<boolean>(
          IS_PUBLIC_KEY,
          controller[method as keyof SimulationController],
        );
        expect(isPublic).toBeFalsy();
      }
    });

    it("must require ADMIN role via @Roles(UserRole.ADMIN)", () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, SimulationController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe("Endpoint Execution", () => {
    it("should return state from service", async () => {
      const result = await controller.getState();
      expect(service.getState).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.isRunning).toBe(false);
    });

    it("should start scenario with defaults", async () => {
      const result = await controller.startScenario({});
      expect(service.loadScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Santiago Default",
          activeNodes: 50,
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should stop simulation", async () => {
      const result = await controller.stop();
      expect(service.stopSimulation).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should purge simulation test data", async () => {
      const result = await controller.stopAndPurge();
      expect(service.clearTestData).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
