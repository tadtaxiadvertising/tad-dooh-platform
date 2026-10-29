import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";

describe("OnboardingController security boundary", () => {
  const service = {
    onboardAdvertiser: jest.fn(),
    completeOnboarding: jest.fn(),
  };
  const controller = new OnboardingController(
    service as unknown as OnboardingService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps initial registration public", () => {
    const handler = OnboardingController.prototype.onboard;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it("does not expose activation as a public endpoint", () => {
    const handler = OnboardingController.prototype.complete;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).not.toBe(true);
  });

  it("rejects activation without changing advertiser state", async () => {
    await expect(controller.complete()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.completeOnboarding).not.toHaveBeenCalled();
  });
});
