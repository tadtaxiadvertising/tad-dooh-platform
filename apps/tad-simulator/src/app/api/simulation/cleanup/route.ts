import { NextResponse } from 'next/server';

const SIMULATOR_KEY = process.env.TAD_API_KEY || 'tad_prod_v10_bypass_0416_secure_key';
const API_URL = process.env.TAD_API_URL || 'http://localhost:3000/api/v1';

export async function DELETE(request: Request) {
  const key = request.headers.get('x-simulator-key');
  if (key !== SIMULATOR_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/simulation/purge`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-simulator-key': SIMULATOR_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
