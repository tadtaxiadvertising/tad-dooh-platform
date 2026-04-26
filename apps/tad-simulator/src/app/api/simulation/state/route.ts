
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = process.env.TAD_API_URL || 'http://localhost:3001/api/v1';
    const response = await fetch(`${apiUrl}/simulation/state`);
    const json = await response.json();

    if (!response.ok) {
       throw new Error('Failed to fetch status from backend');
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
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
