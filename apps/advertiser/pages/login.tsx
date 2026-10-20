/**
 * Compat shim — /login ahora sirve la misma experiencia unificada que
 * /advertiser/login (PortalAuth + registro de empresa + captura de ?ref=).
 *
 * Se mantiene como re-export (no redirect HTTP) porque existe un redirect
 * permanente 308 histórico /advertiser/login → /login cacheado en algunos
 * navegadores; un redirect aquí provocaría un bucle infinito.
 */
export { default } from "./advertiser/login";
