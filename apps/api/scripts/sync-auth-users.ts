/**
 * sync-auth-users.ts
 *
 * Creates/confirms users in Supabase Auth (GoTrue) using the service_role key.
 * This bridges the gap between the local Prisma DB and Supabase Auth.
 *
 * ROOT CAUSE: Users existed in Prisma (local DB) but NOT in Supabase Auth.
 * signInWithPassword() always failed with "invalid_credentials".
 *
 * Usage:
 *   npx ts-node scripts/sync-auth-users.ts
 *
 * Env vars required (from .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL
 *   TAD_AUTH_SYNC_BOOTSTRAP_PASSWORD (only used when creating missing Auth users)
 */

/**
 * sync-auth-users.ts
 *
 * Creates/confirms users in Supabase Auth (GoTrue) using the service_role key.
 * This bridges the gap between the local Prisma DB and Supabase Auth.
 *
 * ROOT CAUSE: Users existed in Prisma (local DB) but NOT in Supabase Auth.
 * signInWithPassword() always failed with "invalid_credentials".
 *
 * Usage:
 *   npx ts-node scripts/sync-auth-users.ts
 *
 * Env vars required (from .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL
 *   TAD_AUTH_SYNC_BOOTSTRAP_PASSWORD (only used when creating missing Auth users)
 */
import { PrismaClient } from "@prisma/client";

import * as https from "https";

const prisma = new PrismaClient();

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ltdcdhqixvbpdcitthqf.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

function supabaseAdminRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const data = body ? JSON.stringify(body) : undefined;

    const req = https.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode || 0,
              data: JSON.parse(responseData),
            });
          } catch {
            resolve({ status: res.statusCode || 0, data: responseData });
          }
        });
      },
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function upsertAuthUser(
  email: string,
  password: string | undefined,
  appMetadata: Record<string, unknown>,
) {
  // 1. Try to list users and find by email
  const listRes = await supabaseAdminRequest("/auth/v1/admin/users", "GET");
  const users =
    typeof listRes.data === "object" &&
    listRes.data !== null &&
    "users" in listRes.data &&
    Array.isArray(listRes.data.users)
      ? listRes.data.users
      : [];
  const existing = users.find(
    (u: unknown): u is { id: string; email: string } =>
      typeof u === "object" &&
      u !== null &&
      "email" in u &&
      u.email === email &&
      "id" in u &&
      typeof u.id === "string",
  );

  if (existing) {
    console.log(
      `  ℹ️  User ${email} already exists (id=${existing.id}), confirming and updating metadata...`,
    );

    // Update app_metadata and confirm email
    await supabaseAdminRequest(`/auth/v1/admin/users/${existing.id}`, "PUT", {
      app_metadata: appMetadata,
      email_confirm: true,
    });

    console.log(`  ✅ Updated ${email}: confirmed + metadata set`);
    return existing.id;
  }

  // Never create users with a repository-wide default password.
  if (!password) {
    console.error(
      `  ❌ Cannot create ${email}: set TAD_AUTH_SYNC_BOOTSTRAP_PASSWORD in the environment`,
    );
    return null;
  }

  // 2. Create via admin API (auto-confirms)
  console.log(`  🆕 Creating ${email} in Supabase Auth...`);
  const createRes = await supabaseAdminRequest("/auth/v1/admin/users", "POST", {
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });

  if (createRes.status >= 400) {
    console.error(`  ❌ Failed to create ${email}:`, createRes.data);
    return null;
  }

  const user = createRes.data;
  if (
    typeof user !== "object" ||
    user === null ||
    !("id" in user) ||
    typeof user.id !== "string"
  ) {
    throw new Error("Auth user response did not contain an id");
  }
  console.log(`  ✅ Created ${email} (id=${user.id})`);
  return user.id;
}

async function main() {
  console.log("🔐 Syncing Prisma users → Supabase Auth...\n");

  // Fetch all users from Prisma
  const [admins, advertisers, drivers] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, password: true, role: true },
    }),
    prisma.advertiser.findMany({
      select: { id: true, email: true, password: true },
    }),
    prisma.driver.findMany({
      select: { id: true, phone: true, password: true, fullName: true },
    }),
  ]);

  console.log(
    `📊 Found: ${admins.length} admins, ${advertisers.length} advertisers, ${drivers.length} drivers\n`,
  );

  // Only used for newly created Auth users; existing passwords are never overwritten.
  const bootstrapPassword = process.env.TAD_AUTH_SYNC_BOOTSTRAP_PASSWORD;

  // 1. Admin users
  console.log("── Admin Users ──");
  for (const admin of admins) {
    await upsertAuthUser(admin.email, bootstrapPassword, {
      role: admin.role || "ADMIN",
      entityId: admin.id,
    });
  }

  // 2. Advertisers (email-based login)
  console.log("\n── Advertisers ──");
  for (const adv of advertisers) {
    if (!adv.email) {
      console.log(`  ⚠️  Skipping advertiser ${adv.id} (no email)`);
      continue;
    }
    await upsertAuthUser(adv.email, bootstrapPassword, {
      role: "ADVERTISER",
      entityId: adv.id,
    });
  }

  // 3. Drivers (phone-based login via email proxy)
  console.log("\n── Drivers ──");
  for (const driver of drivers) {
    // Drivers log in with phone@tad.driver (email proxy)
    const driverEmail = `${driver.phone}@tad.driver`;
    await upsertAuthUser(driverEmail, bootstrapPassword, {
      role: "DRIVER",
      entityId: driver.id,
    });
  }

  console.log("\n✅ Auth sync complete. Run the login test again.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
