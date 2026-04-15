import { NextResponse } from 'next/server';
import { getSimulationEngine, getResolvedApiUrl } from '@/engine/server-store';

export async function POST() {
  try {
    const apiUrl = getResolvedApiUrl();
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
