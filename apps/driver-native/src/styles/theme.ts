/**
 * theme.ts — TAD Stitched UI Theme System for React Native
 *
 * Preserves the Glassmorphism design identity from the PWA:
 *   - Premium Dark (#0a0a0a) background
 *   - TAD Yellow (#FFD400) accent system
 *   - stitched-card, stitched-glow, text-gradient-gold
 *
 * Adapts CSS backdrop-blur/heavy-shadow to RN equivalents:
 *   - StyleSheet-based glassmorphism with conditional degradation
 *   - PerformanceFallback for low-end tablets (≤4 cores / ≤4GB RAM)
 */

import { Platform, Dimensions } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const Colors = {
  primary: '#0a0a0a',
  primaryLight: '#1a1a1a',
  yellow: '#FFD400',
  yellowAccent: '#facc15',
  yellowDark: '#eab308',
  gold: '#fad400',
  red: '#dc2626',
  redLight: '#ef4444',
  green: '#22c55e',
  greenLight: '#4ade80',
  white: '#FFFFFF',
  whiteAlpha5: 'rgba(255, 255, 255, 0.05)',
  whiteAlpha10: 'rgba(255, 255, 255, 0.10)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.20)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.40)',
  zinc900Alpha40: 'rgba(24, 24, 27, 0.40)',
  zinc900Alpha60: 'rgba(24, 24, 27, 0.60)',
  zinc500: '#71717a',
  zinc300: '#d4d4d8',
  zinc400: '#a1a1aa',
  amber300: '#fcd34d',
  amber500: '#f59e0b',
  emerald400: '#34d399',
  emerald500: '#10b981',
  black: '#000000',
} as const;

// ─── Glassmorphism Styles ─────────────────────────────────────────────────────

export const GlassmorphismStyles = {
  stitchedCard: {
    backgroundColor: Colors.zinc900Alpha40,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha5,
    borderRadius: 40, // 2.5rem ≈ 40px
    overflow: 'hidden' as const,
    // RN shadow (iOS-only; Android uses elevation)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    // Android elevation
    elevation: 8,
  },

  stitchedCardHover: {
    borderColor: 'rgba(255, 212, 0, 0.40)',
    backgroundColor: Colors.zinc900Alpha60,
  },

  stitchedHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.whiteAlpha5,
    paddingBottom: 24,
    marginBottom: 24,
  },

  bottomNav: {
    backgroundColor: 'rgba(10, 10, 10, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 212, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 12,
  },

  activeTab: {
    backgroundColor: 'rgba(255, 212, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 212, 0, 0.12)',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  goldGradientText: {
    color: Colors.white,
    // RN doesn't support CSS gradient text; use gold color for dark bg
  },

  goldBadge: {
    color: Colors.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
  },

  lockOverlay: {
    backgroundColor: '#000000',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
} as const;

// ─── Low-Performance Fallback ────────────────────────────────────────────────
// Removes glassmorphism effects on low-end tablets (≤4 cores, ≤4GB RAM)

export const LowPerfGlassmorphismStyles = {
  stitchedCard: {
    backgroundColor: '#1a1a1a',  // Solid color, no alpha
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,            // Reduced radius
    overflow: 'hidden' as const,
    elevation: 2,                // Minimal shadow
  },

  bottomNav: {
    backgroundColor: '#0f0f0f',  // Solid color
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    elevation: 4,
  },

  activeTab: {
    backgroundColor: 'rgba(255, 212, 0, 0.12)',
    borderWidth: 0,
  },
} as const;

// ─── Performance Detection ────────────────────────────────────────────────────

export function detectLowPerformance(): boolean {
  // React Native doesn't have navigator.hardwareConcurrency or deviceMemory
  // Use expo-device in the hook instead
  const screen = Dimensions.get('screen');
  // Tablets with very low resolution or very small screens likely are low-end
  return screen.width < 600 && screen.height < 400;
}

// ─── Typography ───────────────────────────────────────────────────────────────

export const Typography = {
  heading: {
    fontSize: 28,
    fontWeight: '800' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
} as const;

// ─── Animation Durations ─────────────────────────────────────────────────────

export const Animation = {
  fast: 150,
  normal: 300,
  slow: 700,
  shimmer: 2000,
} as const;
