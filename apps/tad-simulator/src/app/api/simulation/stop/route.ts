
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST() {
  const engine = getSimulationEngine();
  await engine.stop();
  return NextResponse.json({
    success: true,
    message: 'Simulation Engine Offline'
  });
}
