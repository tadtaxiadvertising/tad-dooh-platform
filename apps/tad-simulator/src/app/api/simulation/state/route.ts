
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function GET() {
  const engine = getSimulationEngine();
  
  return NextResponse.json({
    success: true,
    data: {
      isRunning: engine.isRunning,
      config: engine.currentConfig,
      // We could add more metrics here like total drivers online, etc.
      recentLogs: [
        `System Status: ${engine.isRunning ? 'ACTIVE' : 'IDLE'}`,
        `Target Load: ${engine.currentConfig.driverCount} units`,
        `Environment: ${process.env.NODE_ENV}`
      ]
    }
  });
}
