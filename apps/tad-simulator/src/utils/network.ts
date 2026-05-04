
/**
 * Resolves the TAD API URL based on environment and connectivity needs.
 * Handles fallbacks for common unresolvable internal IPs in cloud/docker environments.
 */
export function getResolvedApiUrl(): string {
  const envUrl = process.env.TAD_API_URL || 'http://localhost:3000/api/v1';

  // SRE-Level Logic: If the URL uses an internal IP or domain known to fail, try common service names
  if (envUrl.includes('10.0.1.7')) {
    // 10.0.1.7 is explicitly failing in current logs. 
    // If we're on a local dev machine, localhost is the most likely target.
    // If we're in Docker, 'tad-api' is the standard service name.
    return process.env.NODE_ENV === 'production' 
      ? 'http://tad-api:3000/api/v1' 
      : 'http://localhost:3000/api/v1';
  }

  if (envUrl.includes('proyecto_ia.ibusiness.com.do')) {
    return 'http://tad-api:3000/api/v1';
  }

  return envUrl;
}
