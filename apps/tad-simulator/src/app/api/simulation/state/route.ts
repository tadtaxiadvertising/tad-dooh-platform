import { NextResponse } from 'next/server';
import { getSimulationEngine, getResolvedApiUrl } from '@/engine/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = getResolvedApiUrl();
    const simKey = 'tad_prod_v10_bypass_0416_secure_key';

    const response = await fetch(`${apiUrl}/simulation/state`, {
      headers: { 'x-simulator-key': simKey }
    });
    const json = await response.json();

    if (!response.ok) {
       return NextResponse.json({ 
         success: false, 
         error: `Backend Error ${response.status}: ${json.message || 'Fallback Security Failed'}`,
         details: json
       }, { status: response.status });
    }

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
    const apiUrl = getResolvedApiUrl();
    return NextResponse.json({ 
      success: false, 
      error: `Failed to connect to backend at ${apiUrl}`,
      details: error.message
    }, { status: 500 });
  }
}
