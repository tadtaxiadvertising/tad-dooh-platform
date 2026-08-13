/**
 * Rutas compartidas de la suite E2E v12. Centraliza la resolución del root del
 * repositorio, el reporte consolidado, el directorio de snapshots y el estado
 * compartido entre specs (workers=1).
 */
import { join } from 'node:path';

/** Raíz del repositorio (desde tests/e2e/v12/lib → 4 niveles hacia arriba). */
export const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** Reporte consolidado generado por E2EReporter al final de la corrida. */
export const E2E_REPORT = join(REPO_ROOT, 'e2e-report.md');

/** Directorio de snapshots por caso (cercano al reporte HTML de Playwright). */
export const SNAPSHOT_DIR = join(REPO_ROOT, 'playwright-report', 'e2e-snapshots');

/** Directorio y archivo con el estado compartido entre specs. */
export const STATE_DIR = join(__dirname, '..', '.auth');
export const STATE_FILE = join(STATE_DIR, 'shared-state.json');

/** Directorio de handoff caso→reporte (los specs escriben aquí; el reporter lo lee). */
export const CASES_DIR = join(STATE_DIR, 'cases');
