import { NextResponse } from 'next/server';
import { getSimulationNode } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const node = getSimulationNode();
    
    node.updateConfig(body.config);

    return NextResponse.json({
      success: true,
      message: 'Configuration updated live'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update configuration' }, { status: 500 });
  }
}
