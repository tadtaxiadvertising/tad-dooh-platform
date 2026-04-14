import { NextResponse } from 'next/server';
import { getSimulationNode } from '@/engine/server-store';

export async function GET() {
  try {
    const node = getSimulationNode();
    const state = node.getState();
    const latency = await node.getSyncEngine().measureLatency();

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        apiLatency: latency
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve state' }, { status: 500 });
  }
}
