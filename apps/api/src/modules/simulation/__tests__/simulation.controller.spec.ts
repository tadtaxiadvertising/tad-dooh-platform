import { Reflector } from "@nestjs/core";
import { SimulationController } from "../simulation.controller";
import { SimulationService } from "../simulation.service";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";

describe("SimulationController Security & RBAC", () => {
  let controller: SimulationController;
  let service: jest.Mocked<Partial<SimulationService>>;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    service = {
      getState: jest.fn().mockReturnValue({ isRunning: false, currentScenario: null, fleetCount: 0 }),
      loadScenario: jest.fn().mockResolvedValue(undefined),
      stopSimulation: jest.fn().mockResolvedValue({ success: true }),
      clearTestData: jest.fn().mockResolvedValue(undefined),
    };
    controller = new SimulationController(service as SimulationService);
  });

  it("should have @Roles(UserRole.ADMIN) at the class level", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, SimulationController);
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("must NOT be marked as @Public()", () => {
    const isPublicClass = reflector.get<boolean>(IS_PUBLIC_KEY, SimulationController);
    expect(isPublicClass).toBeFalsy();

    const isPublicGetState = reflector.get<boolean>(IS_PUBLIC_KEY, controller.getState);
    expect(isPublicGetState).toBeFalsy();

    const isPublicStartScenario = reflector.get<boolean>(IS_PUBLIC_KEY, controller.startScenario);
    expect(isPublicStartScenario).toBeFalsy();

    const isPublicStop = reflector.get<boolean>(IS_PUBLIC_KEY, controller.stop);
    expect(isPublicStop).toBeFalsy();

    const isPublicPurge = reflector.get<boolean>(IS_PUBLIC_KEY, controller.stopAndPurge);
    expect(isPublicPurge).toBeFalsy();
  });

  it("should delegate getState to service", async () => {
    const result = await controller.getState();
    expect(service.getState).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: { isRunning: false, currentScenario: null, fleetCount: 0 },
    });
  });

  it("should delegate startScenario with defaults to service", async () => {
    const result = await controller.startScenario({ name: "Custom Scenario" });
    expect(service.loadScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Custom Scenario",
        activeNodes: 50,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("should delegate stop to service", async () => {
    const result = await controller.stop();
    expect(service.stopSimulation).toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: "Simulación detenida." });
  });

  it("should delegate stopAndPurge to service", async () => {
    const result = await controller.stopAndPurge();
    expect(service.clearTestData).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      message: "Datos de prueba eliminados. Entorno limpio.",
    });
  });
});
