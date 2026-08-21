import React, { useEffect, useState } from 'react';
import { PortalAuth } from '@tad/ui';
import { PORTAL_CONFIGS } from '@tad/services';
import CityMapBackdrop from '../../components/advertiser/CityMapBackdrop';

/**
 * Captura del parámetro ?ref= (referralCode) en la URL de entrada del portal.
 *
 * REGLA DE REFERIDOS: si el anunciante llegó por el enlace de un conductor,
 * este código DEBE adjuntarse al payload de POST /advertisers o el conductor
 * perderá su compensación.
 *
 * Persistencia temporal en memoria (variable de módulo, sobrevive navegaciones
 * SPA) con espejo en sessionStorage como red de durabilidad ante recargas.
 */
let cachedReferralCode: string | null = null;

const REFERRAL_STORAGE_KEY = 'tad_adv_referral_code';

export function captureReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  if (cachedReferralCode) return cachedReferralCode;

  try {
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    const stored = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    const ref = (urlRef || stored || '').trim();

    if (ref) {
      cachedReferralCode = ref;
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);
    }
    return cachedReferralCode;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  cachedReferralCode = null;
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export default function AdvertiserLoginPage() {
  // Set after mount to avoid SSR/hydration mismatch
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    setReferralCode(captureReferralCode());
  }, []);

  return (
    <PortalAuth
      config={PORTAL_CONFIGS.ADVERTISER}
      apiLogin={{ endpoint: '/api/proxy/advertisers/login' }}
      registration={{
        endpoint: '/api/proxy/advertisers',
        referralCode,
        onCreated: () => clearReferralCode(),
      }}
      background={
        <>
          <CityMapBackdrop position="fixed" />
          <footer className="fixed bottom-4 left-0 right-0 z-10 text-center text-[11px] font-medium tracking-wide text-white/30">
            TAD Taxi Advertising S.R.L. · Red DOOH República Dominicana
          </footer>
        </>
      }
    />
  );
}
