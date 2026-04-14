import { NextResponse } from 'next/server';
import { getSimulationNode } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const node = getSimulationNode();
    
    // Only pass config if provided, else it uses defaults/previous
    node.start(body.config);

    return NextResponse.json({
      success: true,
      message: 'Simulation Engine Deployed'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to start engine' }, { status: 500 });
  }
}
