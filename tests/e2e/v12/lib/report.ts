/**
 * Consolida los resultados de todos los casos E2E (portales Admin/Advertiser/
 * Driver) y genera el reporte único `e2e-report.md` en la raíz del proyecto.
 *
 * Handoff entre procesos: Playwright ejecuta los specs en workers y el reportero
 * en el proceso principal, así que NO se usa un singleton en memoria. Cada caso
 * se persiste a disco (CASES_DIR) en cada mutación y E2EReporter lee los
 * archivos en onEnd().
 *
 * Uso:
 *   - `startCase(portal, id, title)` → devuelve un objeto Case
 *   - `case.addStep(title, status, detail?, latencyMs?)`
 *   - `installApiWatcher(page, c)` → registra respuestas de red y errores de consola
 *   - El reportero E2EReporter escribe el markdown al finalizar toda la corrida.
 */
import type { Page } from '@playwright/test';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ENV_URLS } from '../../playwright.config';
import { E2E_REPORT, SNAPSHOT_DIR, CASES_DIR } from './paths';

export type Portal = 'admin' | 'advertiser' | 'driver';
export type StepStatus = 'pass' | 'fail' | 'warn';
export type CaseStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface StepRecord {
  title: string;
  status: StepStatus;
  detail?: string;
  latencyMs?: number;
}

export interface ApiCallRecord {
  method: string;
  url: string;
  status: number;
  ok: boolean;
  ms: number;
}

export interface ConsoleRecord {
  level: 'error' | 'warning';
  text: string;
  url: string;
}

export interface Case {
  portal: Portal;
  id: string;
  title: string;
  status: CaseStatus;
  durationMs: number;
  steps: StepRecord[];
  apiCalls: ApiCallRecord[];
  errors: ConsoleRecord[];
  screenshots: string[];
  notes: string[];
  addStep(title: string, status?: StepStatus, detail?: string, latencyMs?: number): void;
  addApiCall(c: ApiCallRecord): void;
  addConsole(e: ConsoleRecord): void;
  addNote(text: string): void;
}

/** Forma serializable de un caso (para el handoff worker → reporter). */
type CaseRecord = Omit<Case, 'addStep' | 'addApiCall' | 'addConsole' | 'addNote'>;

/** Persiste el caso a disco para que el reporter (proceso principal) lo lea. */
function persistCase(c: Case): void {
  const record: CaseRecord = {
    portal: c.portal,
    id: c.id,
    title: c.title,
    status: c.status,
    durationMs: c.durationMs,
    steps: c.steps,
    apiCalls: c.apiCalls,
    errors: c.errors,
    screenshots: c.screenshots,
    notes: c.notes,
  };
  try {
    mkdirSync(CASES_DIR, { recursive: true });
    writeFileSync(join(CASES_DIR, `${c.portal}-${c.id}.json`), JSON.stringify(record, null, 2), 'utf8');
  } catch {
    /* si falla el archivo no se tumba el caso; solo se pierde del reporte */
  }
}

function makeCase(portal: Portal, id: string, title: string): Case {
  const c: Case = {
    portal,
    id,
    title,
    status: 'pass',
    durationMs: 0,
    steps: [],
    apiCalls: [],
    errors: [],
    screenshots: [],
    notes: [],
    addStep(s, st = 'pass', detail?: string, latencyMs?: number) {
      c.steps.push({ title: s, status: st, detail, latencyMs });
      persistCase(c);
    },
    addApiCall(rec) {
      c.apiCalls.push(rec);
      persistCase(c);
    },
    addConsole(rec) {
      c.errors.push(rec);
      persistCase(c);
    },
    addNote(text) {
      c.notes.push(text);
      persistCase(c);
    },
  };
  persistCase(c);
  return c;
}

export function startCase(portal: Portal, id: string, title: string): Case {
  return makeCase(portal, id, title);
}

/** Registra un caso omitido (skip) para que aparezca en el reporte consolidado. */
export function registerSkippedCase(portal: Portal, id: string, title: string): void {
  const c = makeCase(portal, id, title);
  c.status = 'skip';
  c.addNote('Caso omitido: credenciales no configuradas o prerrequisito no disponible.');
}

/** Observa respuestas de red de la API y errores de consola del portal. */
export function installApiWatcher(page: Page, c: Case): void {
  page.on('response', (res) => {
    try {
      const url = res.url();
      const isApi = /\/api\//.test(url);
      if (!isApi) return;
      const ms = res.request().timing().responseEnd
        ? Math.round(res.request().timing().responseEnd)
        : 0;
      c.addApiCall({
        method: res.request().method(),
        url: url.replace(/\/api\//, '/api/').slice(0, 180),
        status: res.status(),
        ok: res.ok(),
        ms,
      });
    } catch {
      /* timing puede no estar disponible; se ignora */
    }
  });

  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    c.addConsole({
      level: type,
      text: msg.text().slice(0, 300),
      url: msg.location().url.slice(0, 120),
    });
  });
}

export function finalizeCase(c: Case, ok: boolean, durationMs: number, screenshots: string[]): void {
  c.status = ok ? (c.steps.some((s) => s.status === 'warn') ? 'warn' : 'pass') : 'fail';
  c.durationMs = durationMs;
  c.screenshots = screenshots;
  if (!ok && c.steps.every((s) => s.status === 'pass')) {
    c.addStep('Asserción global del caso', 'fail', 'El caso terminó en error (ver traza de Playwright)');
  }
  persistCase(c);
}

/* --------------------------------------------------------------------------
 * Reportero de Playwright: escribe e2e-report.md al final de la corrida.
 * ------------------------------------------------------------------------ */
export default class E2EReporter implements Reporter {
  /** Limpia el handoff del intento anterior antes de cada corrida. */
  onBegin(): void {
    try {
      rmSync(CASES_DIR, { recursive: true, force: true });
    } catch {
      /* el directorio puede no existir en la primera corrida */
    }
  }

  /** Registra los casos que no se ejecutaron (skip) para el reporte consolidado. */
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'skipped') return;
    const m = test.title.match(/^(ADM|ADV|DRV)_\d+/);
    if (!m) return;
    const portal: Portal = m[1] === 'ADM' ? 'admin' : m[1] === 'ADV' ? 'advertiser' : 'driver';
    const title = test.title.replace(new RegExp(`^${m[0]}\\s*[—-]\\s*`), '');
    registerSkippedCase(portal, m[0], title);
  }

  /** Lee todos los casos escritos por los workers y genera e2e-report.md. */
  onEnd(): void {
    const out = E2E_REPORT;
    const snaps = SNAPSHOT_DIR;
    mkdirSync(snaps, { recursive: true });

    const now = new Date().toISOString();
    const lines: string[] = [];
    lines.push(`# E2E Report — TAD DOOH Platform`);
    lines.push(``);
    lines.push(`> Fecha: ${now}`);
    lines.push(``);
    lines.push(`## Entornos bajo prueba`);
    lines.push(``);
    lines.push(`| Portal | URL |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Admin | ${ENV_URLS.admin} |`);
    lines.push(`| Advertiser | ${ENV_URLS.advertiser} |`);
    lines.push(`| Driver | ${ENV_URLS.driver} |`);
    lines.push(``);

    const byPortal: Record<Portal, CaseRecord[]> = { admin: [], advertiser: [], driver: [] };
    try {
      const files = readdirSync(CASES_DIR).filter((f) => f.endsWith('.json'));
      for (const f of files) {
        const rec = JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8')) as CaseRecord;
        if (rec?.portal && byPortal[rec.portal]) byPortal[rec.portal].push(rec);
      }
    } catch {
      /* sin archivos de handoff → reporte con 0 casos */
    }

    let total = 0;
    let passed = 0;
    let failed = 0;
    let warned = 0;
    let skipped = 0;

    for (const portal of Object.keys(byPortal) as Portal[]) {
      const portalName = portal.charAt(0).toUpperCase() + portal.slice(1);
      const list = byPortal[portal].sort((a, b) => a.id.localeCompare(b.id));
      lines.push(`## ${portalName} — ${list.length} caso(s)`);
      lines.push(``);

      for (const c of list) {
        total++;
        if (c.status === 'pass') passed++;
        else if (c.status === 'fail') failed++;
        else if (c.status === 'skip') skipped++;
        else warned++;

        const badge = c.status === 'pass' ? 'PASS' : c.status === 'fail' ? 'FAIL' : c.status === 'warn' ? 'WARN' : 'SKIP';
        lines.push(`### ${badge} · ${c.id} — ${c.title}`);
        lines.push(``);
        lines.push(`- **Duración:** ${(c.durationMs / 1000).toFixed(1)}s`);
        lines.push(`- **Llamadas API:** ${c.apiCalls.length} (${c.apiCalls.filter((a) => a.ok).length} OK / ${c.apiCalls.filter((a) => !a.ok).length} error)`);
        lines.push(`- **Errores de consola:** ${c.errors.filter((e) => e.level === 'error').length} · **Warnings:** ${c.errors.filter((e) => e.level === 'warning').length}`);
        if (c.screenshots.length) {
          lines.push(`- **Snapshots:** ${c.screenshots.map((s) => `\`${s.replace(/^.*e2e-snapshots/, 'e2e-snapshots')}\``).join(', ')}`);
        }
        lines.push(``);

        if (c.steps.length) {
          lines.push(`| Paso | Estado | Detalle |`);
          lines.push(`| --- | --- | --- |`);
          for (const s of c.steps) {
            const st = s.status === 'pass' ? 'PASS' : s.status === 'fail' ? 'FAIL' : 'WARN';
            const detail = s.detail ? s.detail.replace(/\|/g, '\\|').slice(0, 160) : '';
            const lat = s.latencyMs != null ? ` (${s.latencyMs}ms)` : '';
            lines.push(`| ${s.title} | ${st} | ${detail}${lat} |`);
          }
          lines.push(``);
        }

        if (c.notes.length) {
          lines.push(`**Notas:**`);
          for (const n of c.notes) lines.push(`- ${n}`);
          lines.push(``);
        }

        const badApi = c.apiCalls.filter((a) => !a.ok);
        if (badApi.length) {
          lines.push(`**Llamadas API fallidas:**`);
          for (const a of badApi) lines.push(`- \`${a.method} ${a.url}\` → ${a.status} (${a.ms}ms)`);
          lines.push(``);
        }

        const errors = c.errors.filter((e) => e.level === 'error');
        if (errors.length) {
          lines.push(`**Errores de consola:**`);
          for (const e of errors.slice(0, 8)) lines.push(`- \`${e.text}\``);
          lines.push(``);
        }
      }
    }

    lines.push(`---`);
    lines.push(``);
    lines.push(`## Resumen global`);
    lines.push(``);
    lines.push(`- **Total:** ${total}`);
    lines.push(`- **PASS:** ${passed}`);
    lines.push(`- **WARN:** ${warned}`);
    lines.push(`- **FAIL:** ${failed}`);
    lines.push(`- **SKIP:** ${skipped}`);
    lines.push(``);
    lines.push(`_Reporte generado automáticamente por la suite E2E v12._`);
    lines.push(``);

    writeFileSync(out, lines.join('\n'), 'utf8');
  }
}
