import * as jwt from "jsonwebtoken";
import { AdvertisersController } from "./advertisers.controller";
import { AdvertisersService } from "./advertisers.service";

describe("Legacy advertiser recovery containment", () => {
  const secret = "synthetic-recovery-test-secret";
  const findUnique = jest.fn();
  const update = jest.fn();
  const config = { get: jest.fn(() => secret) };
  const service = new AdvertisersService(
    { advertiser: { findUnique, update } } as never,
    config as never,
  );
  const controller = new AdvertisersController(service);
  const unavailable = {
    status: 503,
    response: {
      code: "ADVERTISER_PASSWORD_RECOVERY_UNAVAILABLE",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(["known@example.invalid", "unknown@example.invalid"])(
    "does not enumerate accounts or claim an email was sent for %s",
    async (email) => {
      await expect(controller.recoverPassword({ email })).rejects.toMatchObject(
        unavailable,
      );
      expect(findUnique).not.toHaveBeenCalled();
      expect(config.get).not.toHaveBeenCalled();
    },
  );

  it("rejects even a valid signed legacy reset token without changing credentials", async () => {
    const token = jwt.sign(
      {
        sub: "fixture-advertiser",
        email: "known@example.invalid",
        purpose: "reset",
      },
      secret,
      { expiresIn: "15m" },
    );
    for (const supplied of [token, token, "invalid-token"]) {
      await expect(
        controller.resetPassword({
          token: supplied,
          newPassword: "synthetic-new-password",
        }),
      ).rejects.toMatchObject(unavailable);
    }
    expect(update).not.toHaveBeenCalled();
    expect(config.get).not.toHaveBeenCalled();
  });
});
