import { DriversController } from "../drivers.controller";
import { DriversService } from "../drivers.service";
import type { SystemSettingsService } from "../../system-settings/system-settings.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn(),
}));

describe("Public driver signup must never assign hardware or privileged fields", () => {
  it("drops a client-supplied device, direct referrer ID and financial flags", async () => {
    const create = jest.fn().mockResolvedValue({ id: "new-driver" });
    const controller = new DriversController(
      { create } as unknown as DriversService,
      {} as SystemSettingsService,
    );

    const payload = {
      fullName: "Conductor de prueba",
      phone: "8095551234",
      password: "example-safe-password",
      contractAccepted: true,
      agreementVersion: "2.0",
      deviceId: "tablet-owned-by-another-driver",
      referredBy: "attacker-controlled-driver-id",
      subscriptionPaid: true,
      subscriptionEnd: "2031-01-01",
      status: "ACTIVO",
    };

    await controller.create(payload, undefined, "VALID-REFERRAL-CODE");

    expect(create).toHaveBeenCalledTimes(1);
    const submitted = create.mock.calls[0][0];
    expect(submitted).toMatchObject({
      fullName: payload.fullName,
      phone: payload.phone,
      contractAccepted: true,
      agreementVersion: "2.0",
      referralCode: "VALID-REFERRAL-CODE",
      subscriptionPaid: false,
      subscriptionEnd: undefined,
    });
    expect(submitted).not.toHaveProperty("deviceId");
    expect(submitted).not.toHaveProperty("referredBy");
    expect(submitted).not.toHaveProperty("status");
  });

  it("does not reassign a tablet even when the service receives a forged runtime deviceId", async () => {
    const deviceUpdate = jest.fn().mockResolvedValue({ id: "device-stolen" });
    const driverCreate = jest.fn().mockResolvedValue({
      id: "new-driver",
      fullName: "Conductor de prueba",
      phone: "8095551234",
      status: "PENDIENTE_PAGO",
      onboardingStatus: "READY",
      subscriptionPaid: false,
      devices: [],
      password: "hashed-password",
    });
    const service = new DriversService(
      {
        driver: { create: driverCreate, findUnique: jest.fn() },
        device: { update: deviceUpdate },
      } as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    const untrustedPayload = {
      fullName: "Conductor de prueba",
      phone: "8095551234",
      contractAccepted: true,
      deviceId: "tablet-owned-by-another-driver",
    };

    await expect(service.create(untrustedPayload)).resolves.toHaveProperty(
      "id",
      "new-driver",
    );

    expect(driverCreate).toHaveBeenCalledTimes(1);
    expect(deviceUpdate).not.toHaveBeenCalled();
  });
});
