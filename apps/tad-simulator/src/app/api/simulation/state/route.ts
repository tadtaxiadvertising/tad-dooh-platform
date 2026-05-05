
import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/utils/network';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = getResolvedApiUrl();
    // Only log in development to avoid spamming the production logs every few seconds
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Simulator] Fetching state from: ${apiUrl}/simulation/state`);
    }
    const response = await fetch(`${apiUrl}/simulation/state`);
    
    if (!response.ok) {
       const errorBody = await response.text().catch(() => 'No error body');
       throw new Error(`Backend (${apiUrl}) responded with ${response.status}: ${errorBody}`);
    }

    const json = await response.json();
    const backendStatus = json.data;
    
    return NextResponse.json({
      success: true,
      data: {
        isRunning: backendStatus.isRunning,
        config: backendStatus.currentScenario || {},
        recentLogs: [
          `System Status: ${backendStatus.isRunning ? 'ACTIVE' : 'IDLE'}`,
          `Fleet Units: ${backendStatus.fleetCount || 0} units`,
          `Environment: ${process.env.NODE_ENV}`
        ]
      }
    });
  } catch (error: any) {
    // SILENT FALLBACK: No logs in production for connection failures
    return NextResponse.json({ 
      success: true, 
      isFallback: true,
      data: {
        isRunning: false,
        config: {},
        recentLogs: ['[Local Engine] Standalone mode active']
      }
    }, { status: 200 });
  }
}
