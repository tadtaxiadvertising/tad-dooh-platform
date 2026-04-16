
import { NextResponse } from 'next/server';
import { getSimulationEngine, getResolvedApiUrl } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = getResolvedApiUrl();
    const simKey = 'tad_prod_v10_bypass_0416_secure_key';
    
    console.log(`[SIMULATOR] Deploying scenario to: ${apiUrl}/simulation/scenario`);
    console.log(`[SIMULATOR] Using Key (Last 4): ***${simKey.slice(-4)}`);

    const response = await fetch(`${apiUrl}/simulation/scenario`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-simulator-key': simKey
      },
      body: JSON.stringify(body.config || {})
    });

    const data = await response.json();

    if (!response.ok) {
       throw new Error(`Backend Error ${response.status}: ${data.message || 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Simulation Engine Deployed in Backend'
    });
  } catch (error: any) {
    console.error('API_START_ERROR:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to start engine', details: error.message }, { status: 500 });
  }
}
