import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BACKEND_BASE = (
  process.env.BACKEND_INTERNAL_URL || 
  'https://proyecto-ia-tad-api.rewvid.easypanel.host'
).replace(/\/$/, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { secret } = req.body;

  // Una capa extra de seguridad simple
  if (secret !== 'TAD_CLEAN_2026') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const targetUrl = `${BACKEND_BASE}/api/admin/reset-database`;
    console.log(`[CLEAN_DB] Triggering reset at: ${targetUrl}`);

    const response = await axios.post(targetUrl, {}, {
      headers: {
        'x-admin-secret': 'SUPER_SECRET_TAD_CLEAN_TOKEN' // El backend debe validar esto
      }
    });

    return res.status(200).json({ 
      message: 'Reset protocol initiated', 
      backendResponse: response.data 
    });
  } catch (error: any) {
    console.error('[CLEAN_DB_ERROR]', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      message: 'Failed to reset database',
      error: error.response?.data || error.message
    });
  }
}
