'use client';
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase, type PortalConfig } from '@tad/services';
import clsx from 'clsx';

/**
 * GoogleSignInButton — One-tap OAuth via Supabase.
 *
 * Flow:
 *   1. Click → supabase.auth.signInWithOAuth({ provider: 'google' })
 *   2. Supabase redirects to Google consent screen
 *   3. Google redirects to Supabase callback
 *   4. Supabase redirects to {origin}/portal/auth/callback?next=…&provider=google
 *   5. AuthCallback page exchanges the Supabase access_token with our backend
 *      (POST /auth/oauth/exchange) which validates the role and injects
 *      app_metadata.role so subsequent JWT validations carry the right claims.
 *   6. Frontend persists tokens into the portal's localStorage keys and
 *      redirects to the dashboard.
 *
 * Setup prerequisites (see docs/AUTH_SETUP.md):
 *   - Google OAuth Client ID + Secret in Supabase Dashboard > Authentication > Providers > Google
 *   - Authorized redirect URI: <origin>/admin/auth/callback, /advertiser/auth/callback
 *   - Google Cloud Console > OAuth Client > Authorized redirect URIs:
 *     https://ltdcdhqixvbpdcitthqf.supabase.co/auth/v1/callback
 */

interface GoogleSignInButtonProps {
  config: PortalConfig;
  /** Optional override for label. */
  label?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** Optional className override for the button surface. */
  className?: string;
}

export function GoogleSignInButton({
  config,
  label = 'Continuar con Google',
  disabled = false,
  className,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setError(null);
    setLoading(true);

    const origin = window.location.origin;
    const redirectTo = `${origin}${config.callbackPath}?next=${encodeURIComponent(config.dashboardPath)}&provider=google`;

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { portal: config.role },
        },
      });

      if (oauthError) {
        setLoading(false);
        setError(oauthError.message);
        return;
      }
      // On success, supabase performs window.location.assign() — we never reach here.
      void router;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.';
      setLoading(false);
      setError(message);
    }
  }, [config, router]);

  const accentColor = config.accentColor;
  const buttonStyle: React.CSSProperties = {
    borderColor: accentColor,
    color: accentColor,
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={label}
        className={clsx(
          'w-full h-11 flex items-center justify-center gap-2.5',
          'bg-transparent',
          'border-2 font-medium text-[13px] tracking-tight',
          'rounded-xl transition-all duration-200',
          'hover:bg-[rgba(0,0,0,0.03)] active:bg-[rgba(0,0,0,0.05)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          className
        )}
        style={buttonStyle}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Conectando con Google…</span>
          </>
        ) : (
          <>
            {/* Official Google "G" logo — flat multi-color SVG, brand-safe */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              aria-hidden="true"
              width="18"
              height="18"
              style={{ width: 18, height: 18, flexShrink: 0 }}
            >
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      {error ? (
        <p className="text-[11px] text-rose-400 text-center leading-relaxed px-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}
