/**
 * Limpia el estado de la corrida anterior: elimina el reporte consolidado,
 * los snapshots de sesión y el estado compartido entre specs.
 * Corre una sola vez antes de ejecutar los tests.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { E2E_REPORT, SNAPSHOT_DIR, STATE_DIR } from './paths';

export default function globalSetup() {
  rmSync(E2E_REPORT, { force: true });
  rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  rmSync(STATE_DIR, { recursive: true, force: true });
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });
}
