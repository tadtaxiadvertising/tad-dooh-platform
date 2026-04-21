import { NextResponse } from 'next/server';
import { getResolvedApiUrl } from '@/engine/server-store';

export async function GET() {
  return NextResponse.json({
    env: process.env.NODE_ENV,
    resolvedUrl: getResolvedApiUrl(),
    tadApiUrl: process.env.TAD_API_URL || 'NOT_SET'
  });
}
