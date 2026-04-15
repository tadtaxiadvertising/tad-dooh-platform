
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = process.env.TAD_API_URL || (process.env.NODE_ENV === 'production' ? 'http://tad-api:3000/api/v1' : 'http://localhost:3000/api/v1');
    const simKey = process.env.SIMULATOR_API_KEY || 'xxx-sim-secret-xxx';
    
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
