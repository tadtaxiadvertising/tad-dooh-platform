/**
 * Utilidad SRE: acceso seguro a variables de entorno críticas.
 * Crash-early si la variable no está configurada, evitando fallbacks
 * inseguros que permiten firmar tokens con secretos predecibles.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Variable de entorno requerida "${name}" no está configurada. Revisar EasyPanel Secrets / .env.`,
    );
  }
  return value;
}
