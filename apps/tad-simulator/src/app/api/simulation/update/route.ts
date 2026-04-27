
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const engine = getSimulationEngine();
    
    if (body.config) {
      engine.updateConfig(body.config);
    }

    return NextResponse.json({
      success: true,
      message: 'Config Updated'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
  }
}
