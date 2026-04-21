import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/engine/server-store';

export async function POST(req: Request) {
    try {
        const apiUrl = getResolvedApiUrl();
        const simKey = 'tad_prod_v10_bypass_0416_secure_key';

        // Validar llave para evitar abusos externos
        const incomingKey = req.headers.get('x-simulator-key');
        if (incomingKey !== simKey) {
            return NextResponse.json({ success: false, error: 'Unauthorized Bypass' }, { status: 401 });
        }

        // Delegar el refresco al API Backend central (NestJS) que tiene la lógica de todas las vistas
        const response = await fetch(`${apiUrl}/simulation/purge`, { 
            method: 'DELETE',
            headers: { 'x-simulator-key': simKey }
        });
        
        const data = await response.json();

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
