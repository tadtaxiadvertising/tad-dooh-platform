import { NextResponse } from 'next/server';
import { CleanupService } from '../../../../engine/CleanupService';
import { getResolvedApiUrl } from '@/engine/server-store';

export async function POST(req: Request) {
    try {
        const apiUrl = getResolvedApiUrl();
        const simKey = 'tad_prod_v10_bypass_0416_secure_key';

        const response = await fetch(`${apiUrl}/simulation/purge`, { 
            method: 'DELETE',
            headers: { 'x-simulator-key': simKey }
        });
        const data = await response.json();

        if (response.ok && data.success) {
            return NextResponse.json({ success: true, message: data.message || 'Simulated data purged from system.' });
        } else {
            return NextResponse.json({ success: false, error: data.message || 'Failed to purge' }, { status: 500 });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
