/**
 * Utilidades compartidas de la suite E2E v12.
 */
import { Page } from '@playwright/test';
import { join } from 'node:path';
import { SNAPSHOT_DIR } from './paths';

/** Captura un screenshot del caso y devuelve la ruta absoluta del archivo. */
export async function snapshot(page: Page, caseId: string, name: string): Promise<string> {
  const file = join(SNAPSHOT_DIR, `${caseId}-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
  } catch {
    /* screenshot opcional — no debe tumbar el caso */
  }
  return file;
}

/** Genera un teléfono dominicano único de 10 dígitos (809-5xx-xxxx). */
export function randomPhone(): string {
  const d = () => Math.floor(Math.random() * 10);
  return `8095${d()}${d()}${d()}${d()}${d()}${d()}`;
}

/**
 * Password por defecto que genera el backend para conductores creados por
 * Admin (apps/api/src/modules/drivers/drivers.service.ts): `Tad-{digits}!`.
 */
export function defaultDriverPassword(phone: string): string {
  return `Tad-${phone.replace(/\D/g, '')}!`;
}

/** Placa de vehículo única para evitar colisiones entre corridas E2E. */
export function randomPlate(): string {
  const d = () => Math.floor(Math.random() * 10);
  return `E2E-${d()}${d()}${d()}${d()}`;
}

/** Cédula dominicana válida de 11 dígitos para el formulario bancario. */
export function randomCedula(): string {
  const d = () => Math.floor(Math.random() * 10);
  return `${d()}${d()}1${d()}${d()}${d()}${d()}${d()}${d()}${d()}${d()}`;
}
