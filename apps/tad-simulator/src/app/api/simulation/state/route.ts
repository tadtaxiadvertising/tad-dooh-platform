
import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/utils/network';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = getResolvedApiUrl();
    console.log(`[Simulator] Env: ${process.env.NODE_ENV} | Fetching state from: ${apiUrl}/simulation/state`);
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
    console.error('SIMULATOR_STATE_FETCH_ERROR:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
