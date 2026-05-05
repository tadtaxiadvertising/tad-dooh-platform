
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
    // Suppress verbose logs for known connectivity issues in Local Engine mode
    const isOffline = error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed');
    if (!isOffline) {
      console.error('SIMULATOR_STATE_FETCH_ERROR:', error.message);
    }
    
    return NextResponse.json({ 
      success: true, 
      isFallback: true,
      data: {
        isRunning: false,
        config: {},
        recentLogs: ['[Local Mode] Backend connection unavailable', 'Operating in standalone engine mode']
      }
    }, { status: 200 }); // Retornamos 200 para no triggear catch() global, manejamos con flag
  }
}
