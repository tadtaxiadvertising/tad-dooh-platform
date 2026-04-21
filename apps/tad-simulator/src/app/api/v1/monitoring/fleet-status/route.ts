import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/engine/server-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiUrl = getResolvedApiUrl();
    const simKey = 'tad_prod_v10_bypass_0416_secure_key';

    const response = await fetch(`${apiUrl}/monitoring/fleet-status`, {
      headers: { 
        'x-simulator-key': simKey,
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) {
       return NextResponse.json({ success: false, error: 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
