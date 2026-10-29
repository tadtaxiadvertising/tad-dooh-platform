import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OnboardAdvertiserDto } from "./onboard-advertiser.dto";

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
