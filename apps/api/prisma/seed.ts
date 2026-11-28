import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const { assertLocalSeedAllowed } =
  require("../scripts/assert-local-seed.cjs") as {
    assertLocalSeedAllowed: (env: NodeJS.ProcessEnv) => void;
  };
assertLocalSeedAllowed(process.env);

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 TAD PLATFORM ZERO-WASTE SEEDING...");

  const hashedPassword = await bcrypt.hash("tad12345", 10);

  // 1. TRANSACTIONAL PURGE (Resilient) - PROTEGIDO EN PRODUCCIÓN
  if (process.env.NODE_ENV !== "production") {
    const tablesToClear = [
      "analyticsEvent",
      "playbackEvent",
      "deviceHeartbeat",
      "deviceCommand",
      "driverLocation",
      "playlistItem",
      "deviceCampaign",
      "mediaAsset",
      "video",
      "media",
      "campaignMetric",
      "campaign",
      "advertiser",
      "payrollPayment",
      "subscription",
      "device",
      "driver",
      "user",
      "fleet",
    ] as const;

    console.log("🧹 Purging database tables...");
    for (const table of tablesToClear) {
      try {
        await (
          prisma[table] as { deleteMany(): Promise<Prisma.BatchPayload> }
        ).deleteMany();
      } catch (e) {
        console.warn(
          `⚠️ Warning: Could not clear table ${table}. It might not exist.`,
        );
      }
    }
    console.log(
      "🧹 Database purged. Generating clean state (10 Advertisers, 10 Drivers, 10 Devices)...",
    );
  } else {
    console.log("⚠️ PRODUCTION ENVIRONMENT DETECTED: Skipping full purge.");
    console.log("🌱 Ensuring basic simulation data exists...");
  }

  // CREACIÓN GARANTIZADA DE DATOS DE SIMULACIÓN (Demo)
  await prisma.driver.upsert({
    where: { phone: "1000000000" }, // Dummy unique phone
    update: {},
    create: {
      phone: "1000000000",
      fullName: "Chofer de Pruebas (Simulador)",
      subscriptionPaid: true,
      status: "OPERATIVO",
      cedula: "000-0000000-0",
    },
  });

  // Ensure Demo Advertiser exists
  const demoAdvertiser = await prisma.advertiser.upsert({
    where: { email: "test@tad.do" },
    update: {},
    create: {
      email: "test@tad.do",
      companyName: "TAD Demo Advertiser",
      contactName: "Admin",
      phone: "1000000001",
      status: "ACTIVE",
      password: hashedPassword,
      category: "Tecnología",
    },
  });

  // Ensure Demo Campaign exists
  await prisma.campaign.upsert({
    where: { id: "demo-sim-campaign" },
    update: {},
    create: {
      id: "demo-sim-campaign",
      name: "Campaña Demo (Simulador)",
      advertiser: demoAdvertiser.companyName,
      advertiserId: demoAdvertiser.id,
      status: "ACTIVE",
      active: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      targetImpressions: 50000,
      budget: 10000,
      category: "Tecnología",
      priority: 1,
      targetAll: true,
    },
  });
  console.log(
    "✅ Base de datos lista para simulación con Driver y Campaña verificados.",
  );

  if (process.env.NODE_ENV === "production") {
    return; // Evita correr el resto del seed pesado en producción
  }

  // 2. CREATE ADMIN
  await prisma.user.create({
    data: {
      email: "admin@tadtaxi.do",
      password: hashedPassword,
      name: "Director de Operaciones TAD",
      role: "ADMIN",
    },
  });

  // 3. CREATE ADVERTISERS & CAMPAIGNS
  const categories = [
    "Finanzas",
    "Consumo",
    "Tecnología",
    "Retail",
    "Salud",
    "Automotriz",
    "Turismo",
    "Educación",
    "Real Estate",
    "Gastronomía",
  ];

  for (let i = 1; i <= 10; i++) {
    const category = categories[i - 1];
    const advertiser = await prisma.advertiser.create({
      data: {
        companyName: `Marca Premium ${i}`,
        contactName: `Gerente de Marketing ${i}`,
        email: `marketing${i}@brand.do`,
        phone: `809-555-${1000 + i}`,
        status: "ACTIVE",
        password: hashedPassword,
        category,
      },
    });

    // Create 1 Active Campaign per Advertiser
    const campaign = await prisma.campaign.create({
      data: {
        name: `Campaña ${category} 2026`,
        advertiser: advertiser.companyName,
        advertiserId: advertiser.id,
        status: "ACTIVE",
        active: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        targetImpressions: 100000,
        budget: 50000,
        category,
        priority: i % 3 === 0 ? 2 : 1,
        targetAll: true,
      },
    });

    // Add Video Asset
    await prisma.video.create({
      data: {
        campaignId: campaign.id,
        title: `Spot ${category} 15s`,
        url: `https://ltdcdhqixvbpdcitthqf.supabase.co/storage/v1/object/public/media/samples/demo_${(i % 3) + 1}.mp4`,
        duration: 15,
        fileSize: 5000000,
        qrUrl: `https://tadtaxi.do/link/c/${campaign.id}`,
      },
    });
  }

  // 4. CREATE DRIVERS & DEVICES
  const cities = ["Santo Domingo", "Santiago", "Punta Cana"];
  const hardwareIds = [
    "NX-001",
    "NX-002",
    "NX-003",
    "NX-004",
    "NX-005",
    "NX-006",
    "NX-007",
    "NX-008",
    "NX-009",
    "NX-010",
  ];

  for (let i = 1; i <= 10; i++) {
    const driver = await prisma.driver.create({
      data: {
        fullName: `Socio Conductor ${i}`,
        phone: `829555${(i - 1).toString().padStart(4, "0")}`,
        cedula: `001-${1000000 + i}-1`,
        taxiPlate: `A${1000 + i}P`,
        status: "OPERATIVO",
        onboardingStatus: "COMPLETED",
        password: hashedPassword,
        contractAccepted: true,
      },
    });

    const hwId = hardwareIds[i - 1];
    const city = cities[i % cities.length];

    const device = await prisma.device.create({
      data: {
        deviceId: hwId,
        name: `Terminal ${hwId}`,
        status: "OPERATIVO",
        isOnline: true,
        city,
        driverId: driver.id,
        batteryLevel: 90 + (i % 10),
        appVersion: "3.0.0-gold",
      },
    });

    // 5. GENERATE PLAYLOGS & TELEMETRY (Field Test Mocks)
    // 50 logs per device in the last 24h
    const logs: Prisma.PlaybackEventCreateManyInput[] = [];
    const locations: Prisma.DriverLocationCreateManyInput[] = [];
    const baseLat =
      city === "Santo Domingo"
        ? 18.4861
        : city === "Santiago"
          ? 19.4517
          : 18.582;
    const baseLng =
      city === "Santo Domingo"
        ? -69.9312
        : city === "Santiago"
          ? -70.697
          : -68.4055;

    for (let j = 0; j < 5; j++) {
      const timestamp = new Date(Date.now() - j * 15 * 60 * 1000); // Every 15 mins

      // Playback event
      logs.push({
        deviceId: device.deviceId,
        videoId: "seed-video-id", // Mock
        eventType: "COMPLETED",
        lat: baseLat + (Math.random() - 0.5) * 0.01,
        lng: baseLng + (Math.random() - 0.5) * 0.01,
        timestamp,
      });

      // Location trace
      locations.push({
        driverId: driver.id,
        deviceId: device.deviceId,
        latitude: baseLat + (Math.random() - 0.5) * 0.02,
        longitude: baseLng + (Math.random() - 0.5) * 0.02,
        speed: 30 + Math.random() * 20,
        timestamp,
      });
    }

    await prisma.playbackEvent.createMany({ data: logs });
    await prisma.driverLocation.createMany({ data: locations });
  }

  console.log("\n======================================================");
  console.log("✅ SEED COMPLETADO: TAD ZERO-WASTE CLEAN STATE");
  console.log("   - 10 Anunciantes con Campañas Activas");
  console.log("   - 10 Conductores con Terminales Sincronizadas");
  console.log("   - 100 Logs de Playback y Telemetría");
  console.log("   - Credenciales (admin/anunciantes/drivers): tad12345");
  console.log("======================================================");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
