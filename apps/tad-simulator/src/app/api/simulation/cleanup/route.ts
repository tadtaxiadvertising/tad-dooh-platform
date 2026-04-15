import { NextResponse } from 'next/server';
import { CleanupService } from '../../../../engine/CleanupService';

export async function POST(req: Request) {
    try {
        const apiUrl = process.env.TAD_API_URL || (process.env.NODE_ENV === 'production' ? 'http://tad-api:3000/api/v1' : 'http://localhost:3000/api/v1');
        const simKey = process.env.SIMULATOR_API_KEY || 'xxx-sim-secret-xxx';

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
