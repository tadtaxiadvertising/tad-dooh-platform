import { NextResponse } from 'next/server';
import { getSimulationNode } from '@/engine/server-store';

export async function POST() {
  try {
    const node = getSimulationNode();
    node.stop();

    return NextResponse.json({
      success: true,
      message: 'Simulation Engine Halted'
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to stop engine' }, { status: 500 });
  }
}
