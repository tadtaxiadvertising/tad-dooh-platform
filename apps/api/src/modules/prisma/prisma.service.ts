import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _isHealthy = true;

  /** Expose health status for readiness probes */
  get isHealthy(): boolean {
    return this._isHealthy;
  }

  constructor() {
    let url = process.env.DATABASE_URL;
    // SRE v12.1.1: Default 5 connections for Supabase Free Tier on EasyPanel.
    if (url && !url.includes('connection_limit=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}connection_limit=5`;
    } else if (url && url.includes('connection_limit=')) {
      const match = url.match(/connection_limit=(\d+)/);
      if (match && parseInt(match[1]) > 10) {
        console.warn(`⚠️ [SRE] connection_limit=${match[1]} detected in DATABASE_URL. Recommended: 5 for EasyPanel Free Tier.`);
      }
    }

    super({
      datasources: {
        db: {
          // SRE RULE: Force Supabase Pooler (Port 6543)
          url,
        },
      },
      // Only log errors in production to avoid EasyPanel log saturation
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    this.logger.log('🔌 Connecting to Supabase Pooler...');

    const MAX_RETRIES = 5;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        await this.$connect();
        this.logger.log(`✅ Connection established on attempt ${attempts + 1}`);

        // Background initialization to keep startup lean
        this.initializeSreViews().catch(e => {
          this.logger.error(`❌ Background initialization failed: ${e.message}`);
        });

        return;
      } catch (e) {
        attempts++;
        const delay = attempts * 2000;
        this.logger.error(`❌ Attempt ${attempts}/${MAX_RETRIES} failed. Retrying in ${delay / 1000}s...`);
        if (attempts >= MAX_RETRIES) {
          this._isHealthy = false;
          this.logger.error('🚨 FATAL: Could not connect to database after 5 attempts. Service marked as unhealthy.');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * SRE RULE: Initialize Materialized Views in background.
   * fs/path imports at module top-level — no synchronous require() at runtime.
   */
  private async initializeSreViews() {
    try {
      this.logger.log('🏗️ Syncing Materialized Views (Master Sync)...');
      const viewsFile = path.resolve(process.cwd(), 'prisma/views.sql');

      if (!fs.existsSync(viewsFile)) {
        this.logger.warn('⚠️ prisma/views.sql not found. Skipping.');
        return;
      }

      const sql = fs.readFileSync(viewsFile, 'utf8');
      const queries = sql.split(';').map((q: string) => q.trim()).filter((q: string) => q.length > 0);

      for (const query of queries) {
        await this.$executeRawUnsafe(query).catch(e => {
          if (!e.message.includes('already exists')) {
            this.logger.error(`SQL error in view: ${e.message}`);
          }
        });
      }
      this.logger.log('✅ Master Sync Views configured.');
    } catch (viewError) {
      const err = viewError as Error;
      this.logger.error(`❌ Failed to load views script: ${err.message}`);
    }
  }

  // SRE RULE: Close zombie connections on EasyPanel redeploy
  async onModuleDestroy() {
    this.logger.log('🔌 Closing pooler connections (Shutdown/Redeploy)...');
    await this.$disconnect();
  }

  /**
   * Refreshes materialized view for "Master Sync".
   * Must be called whenever a campaign is approved or modified.
   */
  async refreshActiveCampaignsView() {
    this.logger.log('🔄 Refreshing Materialized View (Master Sync)...');
    try {
      await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;');
      this.logger.log('✅ mv_active_campaigns refreshed successfully.');
    } catch (e) {
      const err = e as Error;
      if (err.message.includes('not been populated')) {
        // Fallback if not populated yet
        await this.$executeRawUnsafe('REFRESH MATERIALIZED VIEW mv_active_campaigns;');
      } else {
        this.logger.error(`❌ Error refreshing view: ${err.message}`);
      }
    }
  }
}