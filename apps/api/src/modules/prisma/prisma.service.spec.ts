import { describe, expect, it } from "@jest/globals";
import { normalizeSupabasePoolerUsername } from "./prisma.service";

describe("normalizeSupabasePoolerUsername", () => {
  it("uses the Supabase project ref for a shared-pooler URL using postgres", () => {
    const result = normalizeSupabasePoolerUsername(
      "postgresql://postgres:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
      "https://ltdcdhqixvbpdcitthqf.supabase.co",
    );

    expect(result.normalized).toBe(true);
    expect(result.url).toContain("postgres.ltdcdhqixvbpdcitthqf:password@");
  });

  it("does not change direct connections or an already-correct pooler user", () => {
    expect(
      normalizeSupabasePoolerUsername(
        "postgresql://postgres:password@db.ltdcdhqixvbpdcitthqf.supabase.co:5432/postgres",
        "https://ltdcdhqixvbpdcitthqf.supabase.co",
      ),
    ).toEqual({
      url: "postgresql://postgres:password@db.ltdcdhqixvbpdcitthqf.supabase.co:5432/postgres",
      normalized: false,
    });

    expect(
      normalizeSupabasePoolerUsername(
        "postgresql://postgres.ltdcdhqixvbpdcitthqf:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
        "https://ltdcdhqixvbpdcitthqf.supabase.co",
      ),
    ).toEqual({
      url: "postgresql://postgres.ltdcdhqixvbpdcitthqf:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
      normalized: false,
    });
  });
});
