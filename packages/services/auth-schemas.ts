/**
 * ============================================================
 * TAD DOOH Auth Schemas — Zod Validation Layer
 * ============================================================
 * 
 * Strict validation for all authentication forms.
 * - Blocks SQL injection patterns
 * - Enforces corporate email domains (@tad.do + authorized list)
 * - Password strength requirements
 * 
 * @security CRITICAL — Do not relax these rules without CISO approval
 */

import { z } from 'zod';

// ── Authorized Email Domains ──────────────────────────────────
const AUTHORIZED_DOMAINS = [
  'tad.do',
  'tadtaxi.com',
  'tadmedia.do',
  'gmail.com',       // Allowed for driver accounts
  'hotmail.com',     // Allowed for driver accounts
  'outlook.com',     // Allowed for driver accounts
  'yahoo.com',       // Allowed for driver accounts
] as const;

// ── SQL Injection Detection Patterns ──────────────────────────
const SQL_INJECTION_PATTERNS = [
  /('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  /(\bOR\b\s+\d+=\d+)/i,
  /(\/\*[\s\S]*?\*\/)/,
  /(\bWAITFOR\b|\bBENCHMARK\b)/i,
  /(<script|javascript:|on\w+=)/i,
];

/**
 * Validates that a string does not contain SQL injection patterns
 */
const noSqlInjection = z.string().refine(
  (val) => !SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(val)),
  { message: 'Entrada no válida: caracteres potencialmente peligrosos detectados.' }
);

/**
 * Validates that an email belongs to an authorized domain
 */
const authorizedEmail = z
  .string()
  .email('Formato de correo electrónico no válido.')
  .min(5, 'El correo debe tener al menos 5 caracteres.')
  .max(254, 'El correo es demasiado largo.')
  .transform((email) => email.toLowerCase().trim())
  .pipe(
    z.string().refine(
      (email) => {
        const domain = email.split('@')[1];
        return AUTHORIZED_DOMAINS.includes(domain as typeof AUTHORIZED_DOMAINS[number]);
      },
      { message: 'Dominio de correo no autorizado. Contacta al administrador.' }
    )
  );

/**
 * Login Form Schema
 */
export const LoginSchema = z.object({
  email: authorizedEmail.and(noSqlInjection),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .max(128, 'La contraseña es demasiado larga.')
    .and(noSqlInjection),
});

/**
 * Public Credentials Schema — for portals with open self-registration
 * (e.g. Advertiser). Accepts ANY valid email domain: businesses register
 * with their own corporate addresses, so the internal-domain whitelist
 * does NOT apply here. Injection guards remain active.
 */
export const PublicCredentialsSchema = z.object({
  email: z
    .string()
    .email('Formato de correo electrónico no válido.')
    .min(5, 'El correo debe tener al menos 5 caracteres.')
    .max(254, 'El correo es demasiado largo.')
    .transform((email) => email.toLowerCase().trim())
    .and(noSqlInjection),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .max(128, 'La contraseña es demasiado larga.')
    .and(noSqlInjection),
});

/**
 * Password Recovery Schema
 */
export const RecoverySchema = z.object({
  email: authorizedEmail.and(noSqlInjection),
});

/**
 * Password Update Schema (for /auth/update-password)
 */
export const UpdatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
      .max(128, 'La contraseña es demasiado larga.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número.'
      )
      .and(noSqlInjection),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

// ── Types ─────────────────────────────────────────────────────
export type LoginFormData = z.infer<typeof LoginSchema>;
export type RecoveryFormData = z.infer<typeof RecoverySchema>;
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;

// ── Portal Configuration ──────────────────────────────────────
export type PortalRole = 'ADMIN' | 'ADVERTISER' | 'DRIVER';

export interface PortalConfig {
  role: PortalRole;
  name: string;
  subtitle: string;
  dashboardPath: string;
  loginPath: string;
  recoveryPath: string;
  updatePasswordPath: string;
  callbackPath: string;
  onboardingPath: string;
  accentColor: string;
  tokenKey: string;
  userKey: string;
}

export const PORTAL_CONFIGS: Record<PortalRole, PortalConfig> = {
  ADMIN: {
    role: 'ADMIN',
    name: 'TAD NODE',
    subtitle: 'Centro de Control Administrativo',
    dashboardPath: '/admin/dashboard',
    loginPath: '/admin/login',
    recoveryPath: '/admin/recovery',
    updatePasswordPath: '/admin/update-password',
    callbackPath: '/admin/auth/callback',
    onboardingPath: '/admin/onboarding',
    accentColor: '#FFD400',
    tokenKey: 'tad_admin_token',
    userKey: 'tad_admin_user',
  },
  ADVERTISER: {
    role: 'ADVERTISER',
    name: 'TAD HUB',
    subtitle: 'Portal de Anunciantes',
    dashboardPath: '/advertiser/dashboard',
    loginPath: '/advertiser/login',
    recoveryPath: '/advertiser/recovery',
    updatePasswordPath: '/advertiser/update-password',
    callbackPath: '/advertiser/auth/callback',
    onboardingPath: '/advertiser/onboarding',
    accentColor: '#FFD400',
    tokenKey: 'tad_advertiser_token',
    userKey: 'tad_advertiser_user',
  },
  DRIVER: {
    role: 'DRIVER',
    name: 'TAD DRIVER',
    subtitle: 'Panel del Conductor',
    dashboardPath: '/driver/dashboard',
    loginPath: '/driver/login',
    recoveryPath: '/driver/recovery',
    updatePasswordPath: '/driver/update-password',
    callbackPath: '/driver/auth/callback',
    onboardingPath: '/driver/onboarding',
    accentColor: '#FFD400',
    tokenKey: 'tad_driver_token',
    userKey: 'tad_driver_user',
  },
};

/**
 * Detect which portal we are on from URL path
 */
export function detectPortal(pathname: string): PortalRole {
  if (pathname.includes('/advertiser')) return 'ADVERTISER';
  if (pathname.includes('/driver')) return 'DRIVER';
  return 'ADMIN';
}

/**
 * Get full portal config from URL
 */
export function getPortalConfig(pathname: string): PortalConfig {
  return PORTAL_CONFIGS[detectPortal(pathname)];
}
