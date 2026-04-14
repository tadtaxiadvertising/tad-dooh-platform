
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    let body = {};
    try {
        body = await request.json();
    } catch (e) {}
    const engine = getSimulationEngine();
    
    // Provisioning is handled inside start()
    await engine.start();

    return NextResponse.json({
      success: true,
      message: 'Simulation Engine Deployed'
    });
  } catch (error: any) {
    console.error('API_START_ERROR:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to start engine', details: error.message }, { status: 500 });
  }
}
