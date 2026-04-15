import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST() {
  try {
    const apiUrl = process.env.TAD_API_URL || (process.env.NODE_ENV === 'production' ? 'http://tad-api:3000/api/v1' : 'http://localhost:3000/api/v1');
    const simKey = process.env.SIMULATOR_API_KEY || 'xxx-sim-secret-xxx';

    const response = await fetch(`${apiUrl}/simulation/stop`, { 
      method: 'POST',
      headers: { 'x-simulator-key': simKey }
    });
    const data = await response.json();

    if (!response.ok) {
       throw new Error(data.message || `Failed to stop simulation in backend: ${response.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Simulation Engine Offline in Backend'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
