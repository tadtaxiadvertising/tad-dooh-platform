
import { NextResponse } from 'next/server';
import { getSimulationEngine, getResolvedApiUrl } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = getResolvedApiUrl();
    const simKey = process.env.TAD_API_KEY || process.env.SIMULATOR_API_KEY || 'xxx-sim-secret-xxx';
    
    const response = await fetch(`${apiUrl}/simulation/update`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-simulator-key': simKey
      },
      body: JSON.stringify(body.config || {})
    });

    if (!response.ok) {
        throw new Error('Failed to update config in backend');
    }

    return NextResponse.json({
      success: true,
      message: 'Config Updated in Backend'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to update config', details: error.message }, { status: 500 });
  }
}
