
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function GET() {
  const engine = getSimulationEngine();
  
  return NextResponse.json({
    success: true,
    metrics: engine.getMetrics()
  });
}
