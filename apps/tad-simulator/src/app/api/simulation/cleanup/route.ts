import { NextResponse } from 'next/server';
import { CleanupService } from '../../../../engine/CleanupService';

export async function POST(req: Request) {
    try {
        const cleaner = new CleanupService();
        const result = await cleaner.nukeSimulationData();
        if (result.success) {
            return NextResponse.json({ success: true, message: 'Simulated data purged from system.' });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
