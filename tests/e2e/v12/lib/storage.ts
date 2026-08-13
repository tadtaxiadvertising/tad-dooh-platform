/**
 * Almacenamiento compartido entre specs (workers=1).
 * Permite encadenar datos: el caso Admin crea el conductor y el caso Driver
 * lo reutiliza (teléfono/password), sin depender de valores hardcodeados.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { STATE_FILE } from './paths';

export interface SharedState {
  driverPhone?: string;
  driverPassword?: string;
  driverName?: string;
  adminEmail?: string;
  adminPassword?: string;
  advertiserEmail?: string;
  advertiserPassword?: string;
}

export function readSharedState(): SharedState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as SharedState;
  } catch {
    return {};
  }
}

export function writeSharedState(patch: Partial<SharedState>): void {
  const next = { ...readSharedState(), ...patch };
  writeFileSync(STATE_FILE, JSON.stringify(next, null, 2), 'utf8');
}
