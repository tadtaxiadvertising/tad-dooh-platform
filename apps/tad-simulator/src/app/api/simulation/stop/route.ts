
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST() {
  try {
    const apiUrl = process.env.TAD_API_URL || 'http://localhost:3001/api/v1';
    const response = await fetch(`${apiUrl}/simulation/stop`, { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
       throw new Error(data.message || 'Failed to stop simulation in backend');
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Simulation Engine Offline in Backend'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
