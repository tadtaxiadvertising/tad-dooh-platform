/**
 * TAD DOOH Platform - Fleet Seed Script
 *
 * Registra 10 dispositivos de prueba STI0001-STI0010 con conductores dummy
 * para el Santiago Pilot.
 *
 * Ejecutar: npx ts-node scripts/seed-fleet.ts
 * O:        npm run seed:devices
 *
 * Requiere: DATABASE_URL configurada en .env o env vars
 */

/**
 * TAD DOOH Platform - Fleet Seed Script
 *
 * Registra 10 dispositivos de prueba STI0001-STI0010 con conductores dummy
 * para el Santiago Pilot.
 *
 * Ejecutar: npx ts-node scripts/seed-fleet.ts
 * O:        npm run seed:devices
 *
 * Requiere: DATABASE_URL configurada en .env o env vars
 */
import { PrismaClient } from "@prisma/client";

const { assertLocalSeedAllowed } = require("./assert-local-seed.cjs") as {
  assertLocalSeedAllowed: (env: NodeJS.ProcessEnv) => void;
};
assertLocalSeedAllowed(process.env);

const prisma = new PrismaClient();

const DEVICES = [
  { id: "STI0001", plate: "A000001", city: "Santiago", fleet: "Flota Norte" },
  { id: "STI0002", plate: "A000002", city: "Santiago", fleet: "Flota Norte" },
  { id: "STI0003", plate: "A000003", city: "Santiago", fleet: "Flota Norte" },
  { id: "STI0004", plate: "A000004", city: "Santiago", fleet: "Flota Norte" },
  { id: "STI0005", plate: "A000005", city: "Santiago", fleet: "Flota Norte" },
  { id: "STI0006", plate: "A000006", city: "Santiago", fleet: "Flota Centro" },
  { id: "STI0007", plate: "A000007", city: "Santiago", fleet: "Flota Centro" },
  { id: "STI0008", plate: "A000008", city: "Santiago", fleet: "Flota Centro" },
  { id: "STI0009", plate: "A000009", city: "Santiago", fleet: "Flota Centro" },
  { id: "STI0010", plate: "A000010", city: "Santiago", fleet: "Flota Centro" },
];

const DRIVERS = [
  { name: "Juan Pérez", phone: "8091000001", plate: "A000001" },
  { name: "María García", phone: "8091000002", plate: "A000002" },
  { name: "Carlos López", phone: "8091000003", plate: "A000003" },
  { name: "Ana Martínez", phone: "8091000004", plate: "A000004" },
  { name: "Pedro Rodríguez", phone: "8091000005", plate: "A000005" },
  { name: "Laura Sánchez", phone: "8091000006", plate: "A000006" },
  { name: "José Ramírez", phone: "8091000007", plate: "A000007" },
  { name: "Carmen Torres", phone: "8091000008", plate: "A000008" },
  { name: "Miguel Castillo", phone: "8091000009", plate: "A000009" },
  { name: "Rosa Reyes", phone: "8091000010", plate: "A000010" },
];

async function main() {
  console.log("🚗 TAD DOOH — Fleet Seed Script");
  console.log("=".repeat(50));
  console.log(
    `Registrando ${DEVICES.length} dispositivos con conductores...\n`,
  );

  let driverCount = 0;
  let deviceCount = 0;

  for (let i = 0; i < DEVICES.length; i++) {
    const dev = DEVICES[i];
    const drv = DRIVERS[i];

    try {
      // 1. Create or get Fleet
      const fleet = await prisma.fleet.upsert({
        where: { name: dev.fleet },
        update: {},
        create: { name: dev.fleet, city: dev.city },
      });

      // 2. Create Driver
      const driver = await prisma.driver.upsert({
        where: { phone: drv.phone },
        update: {},
        create: {
          fullName: drv.name,
          phone: drv.phone,
          licensePlate: drv.plate,
          taxiPlate: dev.plate,
          taxiNumber: dev.id,
          status: "OPERATIVO",
          onboardingStatus: "COMPLETED",
          subscriptionPaid: true,
          subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      driverCount++;
      console.log(`  ✅ Conductor: ${drv.name} (${drv.phone})`);

      // 3. Create Device linked to Driver
      await prisma.device.upsert({
        where: { deviceId: dev.id },
        update: { driverId: driver.id },
        create: {
          deviceId: dev.id,
          name: `Tablet ${dev.id}`,
          taxiNumber: dev.plate,
          city: dev.city,
          fleet: fleet.name,
          status: "OPERATIVO",
          isOnline: false,
          batteryLevel: 100,
          driverId: driver.id,
          isSimulated: true,
        },
      });
      deviceCount++;
      console.log(`  ✅ Dispositivo: ${dev.id} → asignado a ${drv.name}`);
    } catch (err) {
      console.error(`  ❌ Error en ${dev.id}: ${(err as Error).message}`);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`  Conductores registrados: ${driverCount}`);
  console.log(`  Dispositivos creados: ${deviceCount}`);

  // Verify
  const totalDrivers = await prisma.driver.count();
  const totalDevices = await prisma.device.count();
  console.log(`\n📈 Total en DB:`);
  console.log(`  Conductores: ${totalDrivers}`);
  console.log(`  Dispositivos: ${totalDevices}`);
  console.log(`\n✅ Seed completado!`);
}

main()
  .catch((e) => {
    console.error("❌ Fatal:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
