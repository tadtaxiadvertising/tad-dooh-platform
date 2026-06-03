
import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/utils/network';

export async function POST() {
  try {
    const apiUrl = getResolvedApiUrl();
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
    const isOffline = error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed');
    if (!isOffline && process.env.NODE_ENV === 'development') {
      console.error('API_STOP_ERROR:', error.message);
    }
    return NextResponse.json({ 
      success: true, 
      isFallback: true,
      message: 'Local Engine Standalone Mode Active' 
    });
  }
}
