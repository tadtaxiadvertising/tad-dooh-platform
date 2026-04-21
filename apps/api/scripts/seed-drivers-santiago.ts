import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('tad2026', 10);
  const drivers = [
    { fullName: 'Antonio Rodriguez', phone: '8095551001', taxiPlate: 'T1001', licensePlate: 'L1001', deviceId: 'STI0001' },
    { fullName: 'Bautista Lopez', phone: '8095551002', taxiPlate: 'T1002', licensePlate: 'L1002', deviceId: 'STI0002' },
    { fullName: 'Carlos Sanchez', phone: '8095551003', taxiPlate: 'T1003', licensePlate: 'L1003', deviceId: 'STI0003' },
    { fullName: 'Daniel Perez', phone: '8095551004', taxiPlate: 'T1004', licensePlate: 'L1004', deviceId: 'STI0004' },
    { fullName: 'Esteban Martinez', phone: '8095551005', taxiPlate: 'T1005', licensePlate: 'L1005', deviceId: 'STI0005' },
    { fullName: 'Francisco Gomez', phone: '8095551006', taxiPlate: 'T1006', licensePlate: 'L1006', deviceId: 'STI0006' },
    { fullName: 'Gilberto Diaz', phone: '8095551007', taxiPlate: 'T1007', licensePlate: 'L1007', deviceId: 'STI0007' },
    { fullName: 'Héctor Ramirez', phone: '8095551008', taxiPlate: 'T1008', licensePlate: 'L1008', deviceId: 'STI0008' },
    { fullName: 'Ismael Castro', phone: '8095551009', taxiPlate: 'T1009', licensePlate: 'L1009', deviceId: 'STI0009' },
    { fullName: 'Jose Jimenez', phone: '8095551010', taxiPlate: 'T1010', licensePlate: 'L1010', deviceId: 'STI0010' }
  ];

  console.log('Seeding 10 Santiago Pilots...');

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        fullName: d.fullName,
        phone: d.phone,
        password,
        taxiPlate: d.taxiPlate,
        licensePlate: d.licensePlate,
        insuranceAccepted: true,
        contractAccepted: true,
        insuranceAcceptedAt: new Date(),
        contractAcceptedAt: new Date(),
        agreementVersion: '1.0',
        status: 'ACTIVE',
        subscriptionPaid: true,
        subscriptionEnd: new Date('2026-12-31')
      }
    });

    // Link device if exists
    const device = await prisma.device.findUnique({ where: { deviceId: d.deviceId } });
    if (device) {
       const driver = await prisma.driver.findUnique({ where: { phone: d.phone } });
       await prisma.device.update({
         where: { id: device.id },
         data: { driverId: driver?.id }
       });
    } else {
       // Create device if not exists
       const driver = await prisma.driver.findUnique({ where: { phone: d.phone } });
       await prisma.device.create({
         data: {
           deviceId: d.deviceId,
           driverId: driver?.id,
           status: 'ONLINE',
           lastSeen: new Date()
         }
       });
    }
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
