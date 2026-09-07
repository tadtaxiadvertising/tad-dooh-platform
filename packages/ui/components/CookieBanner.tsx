'use client';
import React, { useState, useEffect } from 'react';
import { LegalLayout, LegalSection, LegalList, LegalCallout, LegalHighlight, LegalTable } from './LegalLayout';
import { LegalLayoutProps } from './LegalLayout';

interface CookieBannerProps {
  /** Base path for the app (empty for root, '/admin' for admin, '/driver' for driver) */
  basePath?: string;
  /** On accept callback */
  onAccept?: () => void;
  /** On reject callback */
  onReject?: () => void;
  /** On customize callback */
  onCustomize?: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({
  basePath = '',
  onAccept,
  onReject,
  onCustomize,
}) => {
  // Check if preferences are already stored
  const storedPrefs = typeof window !== 'undefined' ? 
    window.localStorage.getItem('tad_cookie_preferences') : null;
  
  const defaultPrefs = {
    essential: true,
    analytics: false,
    functional: false,
    advertisement: false,
  };

  const [preferences, setPreferences] = useState<typeof defaultPrefs>(() => {
    if (storedPrefs) {
      try {
        return { ...defaultPrefs, ...JSON.parse(storedPrefs) };
      } catch {
        return defaultPrefs;
      }
    }
    return defaultPrefs;
  });

  const updatePreference = (category: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: value,
    }));
    // Store in localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tad_cookie_preferences', JSON.stringify(preferences));
    }
  };

  // Check if it's first visit (no stored preferences)
  const isFirstVisit = !storedPrefs;

  if (!isFirstVisit) {
    // Already shown banner, don't render again
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-gray-50 p-3">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l9-14z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Gestión de Cookies TAD</h3>
              <p className="mt-1 text-sm text-gray-500">
                Utilizamos cookies para mejorar tu experiencia en TAD DOOH.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // Accept all essential + analytics
              updatePreference('essential', true);
              updatePreference('analytics', true);
              updatePreference('functional', false);
              updatePreference('advertisement', false);
              if (onAccept) onAccept();
            }}
            className="rounded-md bg-[#FDCB01] px-4 py-2 text-sm font-bold text-black hover:bg-[#FDCB01]/90 transition-colors"
          >
            Aceptar todas (esenciales + analítica)
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Solo seleccionamos cookies esenciales por defecto. Las de analítica
            y marketing requieren tu consentimiento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;