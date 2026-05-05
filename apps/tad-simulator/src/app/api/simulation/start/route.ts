
import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/utils/network';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiUrl = getResolvedApiUrl();
    
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
    const isOffline = error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed');
    if (!isOffline && process.env.NODE_ENV === 'development') {
      console.error('API_START_ERROR:', error.message);
    }
    return NextResponse.json({ 
      success: true, 
      isFallback: true,
      message: 'Local Engine Standalone Mode Active' 
    });
  }
}
