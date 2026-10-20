/**
 * TAD DOOH Platform - Log Cleanup Script
 *
 * Purpose: Reduce DB size by aggregating old logs into campaign_metrics
 * and purging raw data beyond retention periods.
 *
 * Retention Policy:
 *   - analytics_events: 30 days (aggregate to campaign_metrics, then purge)
 *   - driver_locations: 60 days (direct purge)
 *   - playback_events: 90 days (direct purge)
 *   - device_heartbeats: 30 days (direct purge)
 *
 * Scheduled via: EasyPanel cron (recommended: 1st of each month at 3am)
 *
 * Run: npx ts-node scripts/cleanup-old-logs.ts
 * Or:  npm run cleanup:logs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RETENTION = {
  ANALYTICS_EVENTS_DAYS: 30,
  DRIVER_LOCATIONS_DAYS: 60,
  PLAYBACK_EVENTS_DAYS: 90,
  DEVICE_HEARTBEATS_DAYS: 30,
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function aggregateAnalyticsToMetrics(cutoff: Date) {
  console.log(
    `📊 Aggregating analytics_events before ${cutoff.toISOString()}...`,
  );

  const oldEvents = await prisma.analyticsEvent.findMany({
    where: { occurredAt: { lt: cutoff } },
    select: {
      campaignId: true,
      deviceId: true,
      eventType: true,
      occurredAt: true,
    },
  });

  if (oldEvents.length === 0) {
    console.log("  → No old analytics events to aggregate.");
    return;
  }

  // Group by campaignId + date
  const grouped = new Map<
    string,
    {
      impressions: number;
      completions: number;
      errors: number;
      devices: Set<string>;
    }
  >();

  for (const event of oldEvents) {
    if (!event.campaignId) continue;
    const dateKey = event.occurredAt.toISOString().split("T")[0];
    const groupKey = `${event.campaignId}:${dateKey}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        impressions: 0,
        completions: 0,
        errors: 0,
        devices: new Set(),
      });
    }

    const group = grouped.get(groupKey)!;
    if (event.eventType === "IMPRESSION" || event.eventType === "PLAY") {
      group.impressions++;
    } else if (event.eventType === "COMPLETE") {
      group.completions++;
    } else if (event.eventType === "ERROR") {
      group.errors++;
    }
    if (event.deviceId) group.devices.add(event.deviceId);
  }

  // Write aggregated data
  let upserted = 0;
  for (const [groupKey, data] of grouped) {
    const [campaignId, dateStr] = groupKey.split(":");
    const date = new Date(dateStr);

    try {
      await prisma.campaignMetric.upsert({
        where: {
          campaignId_date_city: {
            campaignId,
            date,
            city: "",
          },
        },
        update: {
          totalImpressions: { increment: data.impressions },
          totalCompletions: { increment: data.completions },
          totalErrors: { increment: data.errors },
          uniqueDevices: data.devices.size,
        },
        create: {
          campaignId,
          date,
          city: "",
          totalImpressions: data.impressions,
          totalCompletions: data.completions,
          totalErrors: data.errors,
          uniqueDevices: data.devices.size,
          avgCompletionRate:
            data.impressions > 0
              ? (data.completions / data.impressions) * 100
              : 0,
        },
      });
      upserted++;
    } catch (err) {
      console.warn(
        `  ⚠️ Failed to upsert metric for ${groupKey}:`,
        (err as Error).message,
      );
    }
  }

  console.log(
    `  → Aggregated ${upserted} metric records from ${oldEvents.length} raw events.`,
  );
}

async function purgeTable(
  tableName: string,
  dateField: string,
  cutoff: Date,
): Promise<number> {
  const where = { [dateField]: { lt: cutoff } };

  // Dynamically call the appropriate Prisma model
  let count = 0;
  try {
    switch (tableName) {
      case "analytics_events": {
        const result = await prisma.analyticsEvent.deleteMany({
          where: where as any,
        });
        count = result.count;
        break;
      }
      case "driver_locations": {
        const result = await prisma.driverLocation.deleteMany({
          where: where as any,
        });
        count = result.count;
        break;
      }
      case "playback_events": {
        const result = await prisma.playbackEvent.deleteMany({
          where: where as any,
        });
        count = result.count;
        break;
      }
      case "device_heartbeats": {
        const result = await prisma.deviceHeartbeat.deleteMany({
          where: where as any,
        });
        count = result.count;
        break;
      }
    }
  } catch (err) {
    console.error(`  ❌ Error purging ${tableName}:`, (err as Error).message);
  }

  return count;
}

async function main() {
  console.log("🧹 TAD DOOH — Log Cleanup Script");
  console.log("=".repeat(50));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log("");

  const steps = [
    {
      name: "Analytics Events",
      action: async () => {
        const cutoff = daysAgo(RETENTION.ANALYTICS_EVENTS_DAYS);
        await aggregateAnalyticsToMetrics(cutoff);
        const purged = await purgeTable(
          "analytics_events",
          "occurredAt",
          cutoff,
        );
        console.log(
          `  → Purged ${purged} raw analytics_events older than ${RETENTION.ANALYTICS_EVENTS_DAYS} days.`,
        );
      },
    },
    {
      name: "Driver Locations",
      action: async () => {
        const cutoff = daysAgo(RETENTION.DRIVER_LOCATIONS_DAYS);
        const purged = await purgeTable(
          "driver_locations",
          "timestamp",
          cutoff,
        );
        console.log(
          `  → Purged ${purged} driver_locations older than ${RETENTION.DRIVER_LOCATIONS_DAYS} days.`,
        );
      },
    },
    {
      name: "Playback Events",
      action: async () => {
        const cutoff = daysAgo(RETENTION.PLAYBACK_EVENTS_DAYS);
        const purged = await purgeTable("playback_events", "timestamp", cutoff);
        console.log(
          `  → Purged ${purged} playback_events older than ${RETENTION.PLAYBACK_EVENTS_DAYS} days.`,
        );
      },
    },
    {
      name: "Device Heartbeats",
      action: async () => {
        const cutoff = daysAgo(RETENTION.DEVICE_HEARTBEATS_DAYS);
        const purged = await purgeTable(
          "device_heartbeats",
          "timestamp",
          cutoff,
        );
        console.log(
          `  → Purged ${purged} device_heartbeats older than ${RETENTION.DEVICE_HEARTBEATS_DAYS} days.`,
        );
      },
    },
  ];

  for (const step of steps) {
    console.log(`\n🔹 ${step.name}`);
    try {
      await step.action();
    } catch (err) {
      console.error(`  ❌ Step failed:`, (err as Error).message);
    }
  }

  // Summary stats
  console.log("\n" + "=".repeat(50));

  const counts = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.campaignMetric.count(),
    prisma.driverLocation.count(),
    prisma.playbackEvent.count(),
    prisma.deviceHeartbeat.count(),
  ]);

  console.log("📈 Post-cleanup table sizes:");
  console.log(`  analytics_events:    ${counts[0]} rows`);
  console.log(`  campaign_metrics:    ${counts[1]} rows`);
  console.log(`  driver_locations:    ${counts[2]} rows`);
  console.log(`  playback_events:     ${counts[3]} rows`);
  console.log(`  device_heartbeats:   ${counts[4]} rows`);
  console.log("");
  console.log("✅ Cleanup complete!");
  console.log(`Finished at: ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
