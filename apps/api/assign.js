const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching devices...');
  const devices = await prisma.device.findMany();
  console.log('Devices:', devices.map(d => d.deviceId));

  if (devices.length === 0) {
    console.log('No devices found!');
    return;
  }

  let advertiser = await prisma.advertiser.findFirst();
  if (!advertiser) {
    console.log('No advertisers found, creating mock advertiser...');
    advertiser = await prisma.advertiser.create({
      data: {
         companyName: "TAD TEST",
         contactName: "Mr Test",
         email: "test@tad.do",
         phone: "8091234567"
      }
    });
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: 'TEST GLOBAL MVP',
      advertiser: advertiser.companyName,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 30),
      status: 'ACTIVE',
      isGlobal: true,
      budget: 1000,
      targetImpressions: 5000,
      mediaAssets: {
        create: {
          type: 'VIDEO',
          url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
          duration: 10,
          filename: 'test-video.mp4',
          fileSize: 1000000,
          checksum: 'fake-checksum-123'
        }
      }
    }
  });
  
  console.log('Created campaign:', campaign.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
