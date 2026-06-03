import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/utils/network';

export async function POST() {
    try {
        const apiUrl = getResolvedApiUrl();
        const response = await fetch(`${apiUrl}/simulation/purge`, { method: 'DELETE' });
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
