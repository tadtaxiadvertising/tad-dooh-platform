import 'reflect-metadata';
import handler from './api/index';

const req = { url: '/api/fleet/devices', method: 'GET' };
const res = { 
  status: (code: number) => { console.log('STATUS:', code); return res; }, 
  send: (data: any) => console.log('SEND:', data),
  json: (data: any) => console.log('JSON:', data),
  end: () => console.log('END')
};

handler(req as any, res as any).then(() => console.log('Handler completed')).catch(console.error);
