'use client';
import React, { useEffect, useRef, useState } from 'react';
import { CONSENT_EVENT, CONSENT_STORAGE_KEY, OPEN_COOKIE_SETTINGS_EVENT, ESSENTIAL_ONLY,
  effectiveCookieChoices, privacySignalEnabled, readCookieConsent, saveCookieConsent,
  syncCookieConsentFromStorage, type CookieChoices } from '@tad/services/cookie-consent';

interface CookieBannerProps { basePath?: string; onAccept?: () => void; onReject?: () => void; onCustomize?: () => void; }
const categories = [
  { key: 'functional', label: 'Preferencias adicionales', detail: 'Opciones de comodidad que no son necesarias para usar el portal.' },
  { key: 'analytics', label: 'Analítica', detail: 'Medir visitas y uso del portal. Umami solo se carga si está configurado y lo permites.' },
  { key: 'advertisement', label: 'Marketing', detail: 'Permiso para integraciones publicitarias opcionales. Actualmente no hay píxeles de marketing activos.' },
] as const;

export default function CookieBanner({ onAccept, onReject, onCustomize }: CookieBannerProps) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<CookieChoices>({ ...ESSENTIAL_ONLY });
  const [notice, setNotice] = useState('');
  const [privacySignal, setPrivacySignal] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      if (timer) clearTimeout(timer);
      const saved = readCookieConsent();
      setPreferences(saved ?? { ...ESSENTIAL_ONLY }); setVisible(!saved);
      setPrivacySignal(privacySignalEnabled()); setReady(true);
      if (saved) timer = setTimeout(sync, Math.min(saved.expiresAt - Date.now() + 1, 2147483647));
    };
    const open = () => {
      setPreferences(readCookieConsent() ?? { ...ESSENTIAL_ONLY });
      setPrivacySignal(privacySignalEnabled()); setVisible(true); setCustomizing(true);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) { syncCookieConsentFromStorage(); sync(); }
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync); window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    window.addEventListener('storage', storage); window.addEventListener('focus', sync);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
      window.removeEventListener('storage', storage); window.removeEventListener('focus', sync);
    };
  }, []);
  useEffect(() => { if (visible && customizing) heading.current?.focus(); }, [visible, customizing]);
  const save = (choices: CookieChoices) => {
    const { persisted } = saveCookieConsent(choices);
    setVisible(false); setCustomizing(false);
    setNotice(persisted ? 'Preferencias guardadas. Puedes cambiarlas cuando quieras.'
      : 'La decisión se aplicó en esta pestaña. Tu navegador no permite guardarla para próximas visitas.');
    trigger.current?.focus();
  };
  const dismiss = () => { setCustomizing(false); setVisible(!readCookieConsent()); trigger.current?.focus(); };
  const button = 'min-h-11 rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FDCB01] hover:bg-white/10';
  if (!ready) return null;
  return <>
    <button ref={trigger} type="button" onClick={() => { setPreferences(readCookieConsent() ?? { ...ESSENTIAL_ONLY }); setVisible(true); setCustomizing(true); }}
      className="fixed bottom-3 left-3 z-[210] rounded-full border border-white/30 bg-[#141418] px-4 py-2 text-xs font-semibold text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FDCB01]">Configuración de cookies</button>
    <p role="status" className="sr-only">{notice}</p>
    {notice && !visible && <div className="fixed bottom-14 left-3 right-3 z-[210] max-w-md rounded-xl bg-[#141418] p-3 text-sm text-white shadow-lg">
      {notice}<button type="button" className="ml-3 underline" onClick={() => setNotice('')}>Cerrar</button>
    </div>}
    {visible && <section aria-labelledby="tad-cookie-title" aria-label="Preferencias de cookies" onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}
      className="fixed bottom-0 inset-x-0 z-[220] max-h-[85dvh] overflow-y-auto border-t border-white/20 bg-[#101014] text-white shadow-2xl">
      <div className="mx-auto max-w-5xl p-5 sm:p-6">
        <h2 id="tad-cookie-title" ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">Tú decides sobre las cookies</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">Las necesarias permiten iniciar sesión, proteger tu cuenta y mantener las funciones operativas. Las opcionales están desactivadas hasta que las autorices. Rechazarlas no impide usar TAD.</p>
        <p className="mt-2 text-sm text-white/75">Guardamos tu decisión durante 180 días en este navegador y portal. <a className="text-[#FDCB01] underline" href="/politica-de-cookies">Ver política e inventario</a>.</p>
        {privacySignal && <p className="mt-3 text-sm text-amber-200">Tu navegador solicita no rastrear (GPC o DNT). La analítica y el marketing permanecerán desactivados.</p>}
        {customizing && <fieldset className="mt-5 space-y-3">
          <legend className="font-semibold">Elige por categoría</legend>
          <label className="flex gap-3 rounded-xl border border-white/15 p-3 text-sm"><input type="checkbox" checked disabled className="mt-1 h-4 w-4" /><span><strong>Necesarias — siempre activas</strong><span className="mt-1 block text-white/65">Sesión, seguridad y funcionamiento del servicio. Este control no cierra tu sesión ni borra datos operativos sin sincronizar.</span></span></label>
          {categories.map(category => <label key={category.key} className="flex gap-3 rounded-xl border border-white/15 p-3 text-sm">
            <input type="checkbox" checked={preferences[category.key]} disabled={privacySignal && category.key !== 'functional'}
              onChange={event => setPreferences(previous => effectiveCookieChoices({ ...previous, [category.key]: event.target.checked }))} className="mt-1 h-4 w-4 accent-[#FDCB01]" />
            <span><strong>{category.label}</strong><span className="mt-1 block text-white/65">{category.detail}</span></span>
          </label>)}
        </fieldset>}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button type="button" className={button} onClick={() => { save({ ...ESSENTIAL_ONLY }); onReject?.(); }}>Rechazar opcionales</button>
          {customizing ? <button type="button" className={button} onClick={() => save(preferences)}>Guardar selección</button>
            : <button type="button" className={button} onClick={() => { setCustomizing(true); onCustomize?.(); }}>Personalizar</button>}
          <button type="button" className={button} onClick={() => { save({ essential: true, functional: true, analytics: true, advertisement: true }); onAccept?.(); }}>Aceptar opcionales</button>
        </div>
        {customizing && <button type="button" className="mt-4 text-sm underline" onClick={dismiss}>Cerrar sin guardar</button>}
      </div>
    </section>}
  </>;
}
