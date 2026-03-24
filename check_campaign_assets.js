const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaignId = '88a3de30-8760-44a0-93e4-1fe4e4229e50';
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { mediaAssets: true, media: true, videos: true }
  });
  
  if (!c) return console.log('Campaign not found');
  
  console.log(`Campaign: ${c.name}`);
  console.log(`- mediaAssets count: ${c.mediaAssets.length}`);
  console.log(`- media count: ${c.media.length}`);
  console.log(`- videos count: ${c.videos.length}`);
  
  if (c.mediaAssets.length > 0) console.log('MediaAssets URLs:', c.mediaAssets.map(a => a.url));
  if (c.media.length > 0) console.log('Media URLs:', c.media.map(a => a.url));
  if (c.videos.length > 0) console.log('Videos URLs:', c.videos.map(a => a.url));
}

main().finally(() => prisma.$disconnect());
