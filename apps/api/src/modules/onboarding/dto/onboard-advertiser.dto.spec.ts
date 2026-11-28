import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OnboardAdvertiserDto } from "./onboard-advertiser.dto";
import { OnboardAdvertiserQuoteDto } from "./onboard-advertiser-quote.dto";

describe("OnboardAdvertiserDto password validation", () => {
  const valid = {
    name: "Test User",
    companyName: "Test Company",
    email: "user@example.com",
    phone: "8095550101",
    password: "secure-passphrase",
    budget: 15000,
    expectedScreens: 2,
    targetCity: "Santiago",
  };

  it.each([undefined, "", "1234567"])(
    "rejects absent, blank or short password (%s)",
    async (password) => {
      const dto = plainToInstance(OnboardAdvertiserDto, {
        ...valid,
        password,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === "password")).toBe(true);
    },
  );

  it("accepts a nonempty password with at least eight characters", async () => {
    const errors = await validate(plainToInstance(OnboardAdvertiserDto, valid));
    expect(errors.filter((error) => error.property === "password")).toEqual([]);
  });
});

describe("Advertiser referral quote validation", () => {
  const valid = {
    expectedScreens: 3,
    campaignMonths: 2,
    includeProduction: true,
  };
  it("accepts only a single bounded referral code", async () => {
    const ok = plainToInstance(OnboardAdvertiserQuoteDto, {
      ...valid,
      referralCode: "DRIVER_123-abc",
    });
    expect(await validate(ok)).toEqual([]);
    for (const value of ["", " ", "bad code", "a".repeat(65)]) {
      const dto = plainToInstance(OnboardAdvertiserQuoteDto, {
        ...valid,
        referralCode: value,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === "referralCode")).toBe(
        true,
      );
    }
  });
  it("rejects spoofed eligibility and invalid campaign dimensions", async () => {
    for (const patch of [
      { expectedScreens: 0 },
      { expectedScreens: 101 },
      { campaignMonths: 0 },
      { campaignMonths: 13 },
      { includeProduction: "true" },
    ]) {
      const dto = plainToInstance(OnboardAdvertiserQuoteDto, {
        ...valid,
        ...patch,
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
  });
});
