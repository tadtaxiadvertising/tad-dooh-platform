/**
 * offlineQueue.ts — Native Offline Action Queue (expo-sqlite)
 *
 * Replaces IndexedDB-based offline action queue with SQLite.
 * Same business rules:
 *   - Idempotency keys on all submissions
 *   - Drop items on 200, 409, or 4xx (except 401/402)
 *   - Auto-sync on network reconnect
 *   - Same endpoint normalization
 */

import {
  initDatabase,
  getAllOfflineQueueItems,
  deleteOfflineQueueItem,
  enqueueOfflineAction,
  readAuthValue,
  type OfflineQueueItem,
} from './database';
import { API_BASE_URL } from './api';

const normalizeEndpoint = (endpoint: string): string => {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (endpoint.startsWith('/api/v1')) return `${API_BASE_URL}${endpoint.replace('/api/v1', '')}`;
  if (endpoint.startsWith('/')) return `${API_BASE_URL}${endpoint}`;
  return `${API_BASE_URL}/${endpoint}`;
};

const normalizeBankAccountType = (value: unknown): string => {
  if (value === 'SAVINGS') return 'AHORRO';
  if (value === 'CHECKING') return 'CORRIENTE';
  return typeof value === 'string' ? value : '';
};

const normalizePayload = (endpoint: string, payload: Record<string, unknown>): Record<string, unknown> => {
  if (!endpoint.includes('/wallet/bank')) return payload;
  const { driverId: _driverId, ...rest } = payload;
  return { ...rest, tipo: normalizeBankAccountType(rest.tipo) };
};

export { enqueueOfflineAction };

export const syncOfflineQueue = async (): Promise<{ processed: number; remaining: number; success: boolean }> => {
  initDatabase();
  const items = getAllOfflineQueueItems();

  if (items.length === 0) {
    return { processed: 0, remaining: 0, success: true };
  }

  const authToken = readAuthValue('tad_driver_token');
  let processed = 0;
  let remaining = items.length;

  for (const item of items) {
    const targetEndpoint = normalizeEndpoint(item.endpoint);
    let payload: Record<string, unknown>;
    try {
      payload = normalizePayload(targetEndpoint, JSON.parse(item.payload));
    } catch {
      payload = {};
    }

    try {
      const response = await fetch(targetEndpoint, {
        method: item.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotency_key,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      const shouldDropItem =
        response.ok ||
        response.status === 409 ||
        (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 402);

      if (shouldDropItem) {
        deleteOfflineQueueItem(item.id);
        processed += 1;
        remaining -= 1;
        continue;
      }

      if (response.status === 401 || response.status === 402) {
        break;
      }
    } catch {
      break;
    }
  }

  return { processed, remaining, success: remaining === 0 };
};
