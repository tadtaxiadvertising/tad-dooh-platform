import type { Advertiser, Driver, Device, Campaign } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const { assertLocalSeedAllowed } =
  require("../scripts/assert-local-seed.cjs") as {
    assertLocalSeedAllowed: (env: NodeJS.ProcessEnv) => void;
  };
assertLocalSeedAllowed(process.env);

const prisma = new PrismaClient();

// Business constants matching the service layer
const RATE_PER_AD_DRIVER = 500; // RD$ per active campaign per driver/month
const COST_PER_AD_ADVERTISER = 1500; // RD$ per campaign per advertiser
// SEC: password de seed desde env (OBLIGATORIO); sin default inseguro.
const SEED_PASSWORD = process.env.SEED_PASSWORD;
if (!SEED_PASSWORD || SEED_PASSWORD.length < 8) {
  console.error(
    "❌ SEED_PASSWORD requerido (mín. 8 caracteres). Defínalo en variables de entorno.",
  );
  process.exit(1);
}

const validatedSeedPassword: string = SEED_PASSWORD;

async function main() {
  console.log("=== TAD DOOH Platform — Full Ecosystem Seed ===\n");
  const hashedPw = await bcrypt.hash(validatedSeedPassword, 10);

  // ── Step 1: Advertisers ──────────────────────────────────
  console.log("1/7  Creating 5 advertisers...");
  const advertisersData = [
    {
      companyName: "Brugal & Co",
      contactName: "Marlon Castillo",
      email: "ads@brugal.com",
      phone: "809-555-0101",
      category: "Bebidas",
    },
    {
      companyName: "Cervecería Nacional",
      contactName: "Elena Martínez",
      email: "marketing@cnd.com.do",
      phone: "809-555-0102",
      category: "Bebidas",
    },
    {
      companyName: "Banco Popular",
      contactName: "Roberto Ortiz",
      email: "digital@popularenlinea.com",
      phone: "809-555-0103",
      category: "Finanzas",
    },
    {
      companyName: "Claro RD",
      contactName: "Isabel Mejia",
      email: "business@claro.com.do",
      phone: "809-555-0104",
      category: "Telecomunicaciones",
    },
    {
      companyName: "Altice Dominicana",
      contactName: "Ricardo Valdez",
      email: "ads@altice.com.do",
      phone: "809-555-0105",
      category: "Telecomunicaciones",
    },
  ];

  const advertisers: Advertiser[] = [];
  for (const adv of advertisersData) {
    const record = await prisma.advertiser.upsert({
      where: { email: adv.email },
      update: {},
      create: { ...adv, status: "ACTIVE", password: hashedPw },
    });
    advertisers.push(record);
  }
  console.log(
    `   ✓ ${advertisers.length} advertisers ready (login: email / password de SEED_PASSWORD)`,
  );

  // ── Step 2: Drivers ───────────────────────────────────────
  console.log("2/7  Creating 10 drivers...");
  const driverNames = [
    "Juan Pérez",
    "Miguel Santos",
    "Carlos Reyes",
    "Pedro Díaz",
    "Luis García",
    "Rafael Méndez",
    "Antonio Cruz",
    "Francisco Tapia",
    "José Rodríguez",
    "Manuel Sánchez",
  ];

  const drivers: Driver[] = [];
  for (let i = 0; i < 10; i++) {
    const phone = `82955500${String(i + 1).padStart(2, "0")}`;
    const cedula = `001-00000${String(i + 1).padStart(2, "0")}-${i + 1}`;
    const driver = await prisma.driver.upsert({
      where: { phone },
      update: {},
      create: {
        fullName: driverNames[i],
        phone,
        cedula,
        status: "OPERATIVO",
        subscriptionPaid: true,
        taxiPlate: `T-${String(100 + i + 1)}`,
        onboardingStatus: "COMPLETED",
        password: hashedPw,
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        insuranceAccepted: true,
        insuranceAcceptedAt: new Date(),
        agreementVersion: "2.0",
        // First 3 drivers were referred by each other for referral bonus testing
        referredBy: i >= 3 && i < 6 ? drivers[0]?.id : undefined,
      },
    });
    drivers.push(driver);
  }
  console.log(
    `   ✓ ${drivers.length} drivers ready (login: phone / SEED_PASSWORD from env)`,
  );

  // ── Step 3: Devices (screens) ─────────────────────────────
  console.log("3/7  Creating 10 devices and assigning to drivers...");
  const cities = ["Santo Domingo", "Santiago"];
  const deviceRecords: Device[] = [];

  for (let i = 0; i < 10; i++) {
    const deviceId = `TAD-SCR-${String(i + 1).padStart(3, "0")}`;
    const city = cities[i % 2];
    const device = await prisma.device.upsert({
      where: { deviceId },
      update: { driverId: drivers[i].id },
      create: {
        deviceId,
        name: `Pantalla ${city} #${i + 1}`,
        status: "OPERATIVO",
        isOnline: true,
        city,
        driverId: drivers[i].id,
        appVersion: "2.4.1",
        batteryLevel: 85 + Math.floor(Math.random() * 15),
        lastSyncAt: new Date(),
        lastHeartbeat: new Date(),
        lastSeen: new Date(),
        lastOnline: new Date(),
        lastLat:
          city === "Santo Domingo"
            ? 18.48 + Math.random() * 0.02
            : 19.45 + Math.random() * 0.02,
        lastLng:
          city === "Santo Domingo"
            ? -69.93 + Math.random() * 0.02
            : -70.68 + Math.random() * 0.02,
      },
    });
    deviceRecords.push(device);
  }
  console.log(`   ✓ ${deviceRecords.length} devices assigned to drivers`);

  // ── Step 4: Campaigns (3 active, linked to advertisers) ───
  console.log("4/7  Creating 3 active campaigns with media...");
  const campaignDefs = [
    { name: "Ron Brugal — Tradición Dominicana", advIdx: 0, budget: 15000 },
    { name: "Cuenta Popular Digital", advIdx: 2, budget: 25000 },
    { name: "Claro 5G — Sin Límites", advIdx: 3, budget: 20000 },
  ];

  const campaignRecords: Campaign[] = [];
  for (const def of campaignDefs) {
    const adv = advertisers[def.advIdx];
    const existing = await prisma.campaign.findFirst({
      where: { name: def.name, advertiserId: adv.id },
    });

    let campaign: Campaign;
    if (existing) {
      campaign = existing;
    } else {
      campaign = await prisma.campaign.create({
        data: {
          name: def.name,
          advertiser: adv.companyName,
          advertiserId: adv.id,
          status: "ACTIVE",
          active: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 86400000),
          isGlobal: true,
          targetAll: true,
          budget: def.budget,
          category: adv.category || "General",
        },
      });
    }
    campaignRecords.push(campaign);

    // Create MediaAsset for each campaign
    const existingMedia = await prisma.mediaAsset.findFirst({
      where: { campaignId: campaign.id },
    });
    if (!existingMedia) {
      await prisma.mediaAsset.create({
        data: {
          campaignId: campaign.id,
          type: "VIDEO",
          filename: `${def.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.mp4`,
          url: `https://vibe-dev.b-cdn.net/tad/demo-${def.advIdx + 1}.mp4`,
          fileSize: 5 * 1024 * 1024,
          checksum: `md5-seed-${campaign.id.substring(0, 8)}`,
          duration: 15,
        },
      });
    }

    // Assign campaign to ALL active devices (DeviceCampaign)
    await prisma.deviceCampaign.createMany({
      data: deviceRecords.map((d) => ({
        device_id: d.id,
        campaign_id: campaign.id,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `   ✓ ${campaignRecords.length} campaigns active, assigned to ${deviceRecords.length} devices each`,
  );

  // ── Step 5: Metrics & Analytics (7 days) ──────────────────
  console.log("5/7  Generating 7-day metrics & analytics...");
  const today = new Date();
  let metricsCount = 0;

  for (const campaign of campaignRecords) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      for (const city of cities) {
        const impressions = 1000 + Math.floor(Math.random() * 2000);
        const completions = Math.floor(
          impressions * (0.92 + Math.random() * 0.06),
        );

        await prisma.campaignMetric.upsert({
          where: {
            campaignId_date_city: { campaignId: campaign.id, date, city },
          },
          update: {
            totalImpressions: impressions,
            totalCompletions: completions,
          },
          create: {
            campaignId: campaign.id,
            date,
            city,
            totalImpressions: impressions,
            totalCompletions: completions,
            uniqueDevices: city === "Santo Domingo" ? 5 : 5,
          },
        });
        metricsCount++;
      }
    }

    // QR scans
    const scanCount = 10 + Math.floor(Math.random() * 40);
    for (let j = 0; j < scanCount; j++) {
      const dev =
        deviceRecords[Math.floor(Math.random() * deviceRecords.length)];
      const lat = dev.city === "Santo Domingo" ? 18.48 : 19.45;
      const lng = dev.city === "Santo Domingo" ? -69.93 : -70.68;

      await prisma.analyticsEvent.create({
        data: {
          deviceId: dev.deviceId,
          campaignId: campaign.id,
          eventType: "QR_SCAN",
          eventData: "{}",
          lat: lat + (Math.random() - 0.5) * 0.04,
          lng: lng + (Math.random() - 0.5) * 0.04,
          occurredAt: new Date(Date.now() - Math.random() * 7 * 86400000),
          processed: true,
        },
      });
    }
  }
  console.log(`   ✓ ${metricsCount} metric records, QR scans generated`);

  // ── Step 6: Portal Requests (pending approval) ────────────
  console.log("6/7  Creating portal requests for admin approval...");

  // 2 CAMPAIGN_CREATE requests from advertisers without active campaigns
  for (let i = 0; i < 2; i++) {
    const adv = advertisers[i + 1]; // CND and Banco Popular
    const existingReq = await prisma.portalRequest.findFirst({
      where: {
        advertiserId: adv.id,
        status: "PENDING",
        type: "CAMPAIGN_CREATE",
      },
    });
    if (!existingReq) {
      await prisma.portalRequest.create({
        data: {
          advertiserId: adv.id,
          type: "CAMPAIGN_CREATE",
          title: `Nueva Campaña — ${adv.companyName}`,
          description: `Solicitud de campaña publicitaria para ${adv.companyName}.`,
          status: "PENDING",
          data: JSON.stringify({
            name: `Promoción ${adv.companyName} Q2`,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
            category: adv.category,
            mediaUrl: "https://vibe-dev.b-cdn.net/tad/demo-pending.mp4",
          }),
        },
      });
    }
  }

  // 2 PAYOUT requests from drivers
  for (let i = 0; i < 2; i++) {
    const driver = drivers[i];
    const earnings = campaignRecords.length * RATE_PER_AD_DRIVER;
    const existingReq = await prisma.portalRequest.findFirst({
      where: { driverId: driver.id, status: "PENDING", type: "PAYOUT" },
    });
    if (!existingReq) {
      await prisma.portalRequest.create({
        data: {
          driverId: driver.id,
          type: "PAYOUT",
          title: `Solicitud de Liquidación — ${driver.fullName}`,
          description: `Pago mensual proyectado: RD$${earnings.toLocaleString()}`,
          status: "PENDING",
          data: JSON.stringify({ amount: earnings }),
        },
      });
    }
  }
  console.log("   ✓ 2 campaign requests + 2 payout requests pending");

  // ── Step 7: PayrollPayment history (past months) ──────────
  console.log("7/7  Creating payroll history...");
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Give first 5 drivers a payment record for last month
  for (let i = 0; i < 5; i++) {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const amount = campaignRecords.length * RATE_PER_AD_DRIVER;

    await prisma.payrollPayment.upsert({
      where: {
        driverId_month_year: {
          driverId: drivers[i].id,
          month: prevMonth,
          year: prevYear,
        },
      },
      update: {},
      create: {
        driverId: drivers[i].id,
        amount,
        month: prevMonth,
        year: prevYear,
        status: "PAID",
        paidAt: new Date(prevYear, prevMonth - 1, 28),
        referenceNum: `SEED-${prevYear}${String(prevMonth).padStart(2, "0")}-${i + 1}`,
      },
    });
  }
  console.log("   ✓ Payroll history for 5 drivers");

  // ── Summary ───────────────────────────────────────────────
  console.log("\n=== Seed Complete ===");
  console.log(`  Advertisers:  ${advertisers.length}`);
  console.log(`  Drivers:      ${drivers.length}`);
  console.log(`  Devices:      ${deviceRecords.length}`);
  console.log(`  Campaigns:    ${campaignRecords.length} active`);
  console.log(`  Requests:     4 pending (2 campaign + 2 payout)`);
  console.log(`  Payroll:      5 paid records (last month)`);
  console.log(
    `\n  Default password for all: SEED_PASSWORD from env (no logueado)`,
  );
  console.log(
    `  Driver projected earnings: RD$${campaignRecords.length * RATE_PER_AD_DRIVER}/month per driver`,
  );
  console.log(`  Advertiser cost: RD$${COST_PER_AD_ADVERTISER}/campaign\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
