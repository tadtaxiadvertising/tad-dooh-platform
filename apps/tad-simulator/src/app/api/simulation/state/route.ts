import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = process.env.TAD_API_URL || (process.env.NODE_ENV === 'production' ? 'http://tad-api:3000/api/v1' : 'http://localhost:3000/api/v1');
    const simKey = process.env.SIMULATOR_API_KEY || 'xxx-sim-secret-xxx';

    const response = await fetch(`${apiUrl}/simulation/state`, {
      headers: { 'x-simulator-key': simKey }
    });
    const json = await response.json();

    if (!response.ok) {
       throw new Error(`Backend returned ${response.status}: ${JSON.stringify(json)}`);
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
    const apiUrl = process.env.TAD_API_URL || 'http://tad-api:3000/api/v1';
    return NextResponse.json({ 
      success: false, 
      error: `Failed to connect to backend at ${apiUrl}`,
      details: error.message
    }, { status: 500 });
  }
}
