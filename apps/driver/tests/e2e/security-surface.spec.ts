import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";

const destructiveTestRoute = path.resolve(
  __dirname,
  "../../pages/api/clean-db-test.ts",
);

test.describe("Driver API security surface", () => {
  test("does not ship the destructive database-reset test route", () => {
    expect(existsSync(destructiveTestRoute)).toBe(false);
  });
});
