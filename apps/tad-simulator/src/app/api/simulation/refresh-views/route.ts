
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST() {
  const engine = getSimulationEngine();
  
  if (!engine) {
    return NextResponse.json({ success: false, error: 'Engine not initialized' }, { status: 500 });
  }

  const result = await engine.refreshMaterializedViews();
  
  if (result) {
    return NextResponse.json({ success: true, message: 'Views refreshed successfully' });
  } else {
    return NextResponse.json({ success: false, error: 'Failed to refresh views' }, { status: 500 });
  }
}
