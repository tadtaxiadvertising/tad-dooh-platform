
import { NextResponse } from 'next/server';
import { getSimulationEngine } from '@/engine/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = process.env.TAD_API_URL || 'http://localhost:3001/api/v1';
    
    const response = await fetch(`${apiUrl}/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.config || {})
    });

    const data = await response.json();

    if (!response.ok) {
       throw new Error(data.message || 'Failed to start scenario in backend');
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Simulation Engine Deployed in Backend'
    });
  } catch (error: any) {
    console.error('API_START_ERROR:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to start engine', details: error.message }, { status: 500 });
  }
}
