/**
 * auth/callback.tsx — Auth Callback Handler
 *
 * Processes deep-link auth callbacks:
 *   - Extracts token from URL params (e.g. tad-driver://auth/callback?token=xxx&driverId=yyy&driverName=zzz)
 *   - Stores token in auth state (useAuthStore + SQLite)
 *   - Redirects to dashboard
 *
 * Handles both:
 *   1. Full auth callbacks (token + driverId + driverName) → login immediately
 *   2. Token-only callbacks (just token) → fetch driver info, then login
 *
 * Also handles error params (error=...) and shows appropriate messages.
 */

import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import client from '../../src/lib/api';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Colors, GlassmorphismStyles } from '../../src/styles/theme';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuthStore();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      const token = params.token as string | undefined;
      const driverId = params.driverId as string | undefined;
      const driverName = params.driverName as string | undefined;
      const errorParam = params.error as string | undefined;

      // ── Error callback ────────────────────────────────────────────────
      if (errorParam) {
        setStatus('error');
        setErrorMessage(errorParam);
        return;
      }

      // ── Missing token ─────────────────────────────────────────────────
      if (!token) {
        setStatus('error');
        setErrorMessage('No se recibió el token de autenticación.');
        return;
      }

      // ── Full callback (token + driverId + driverName) ─────────────────
      if (driverId && driverName) {
        login(token, driverId, driverName);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 800);
        return;
      }

      // ── Token-only callback → fetch driver profile ────────────────────
      try {
        const res = await client.get('/drivers/me/hub', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const hubData = res.data;
        const fetchedDriverId = String(hubData?.driverId || '');
        const fetchedDriverName = String(hubData?.driverName || 'Conductor');

        login(token, fetchedDriverId, fetchedDriverName);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 800);
      } catch (err: any) {
        setStatus('error');
        const msg = err?.response?.data?.message || err?.message || 'Error al obtener datos del conductor.';
        setErrorMessage(msg);
      }
    };

    processCallback();
  }, [params]);

  // ── Processing state ──────────────────────────────────────────────────────
  if (status === 'processing') {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center px-6">
        <ActivityIndicator size="large" color={Colors.yellow} />
        <Text className="text-zinc-400 text-sm mt-4 font-bold text-center">
          Procesando autenticación...
        </Text>
        <Text className="text-zinc-600 text-xs mt-2 text-center">
          Verificando tu sesión
        </Text>
      </View>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center px-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.10)',
            borderWidth: 1,
            borderColor: 'rgba(34, 197, 94, 0.20)',
          }}
        >
          <Text className="text-emerald-400 text-3xl font-black">✓</Text>
        </View>

        <Text className="text-[28px] font-black text-white uppercase tracking-tight text-center mb-3">
          Sesión verificada
        </Text>
        <Text className="text-sm text-zinc-400 text-center leading-relaxed">
          Redirigiendo al dashboard...
        </Text>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-tad-dark items-center justify-center px-6">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{
          backgroundColor: 'rgba(220, 38, 38, 0.10)',
          borderWidth: 1,
          borderColor: 'rgba(220, 38, 38, 0.20)',
        }}
      >
        <Text className="text-red-400 text-3xl font-black">✕</Text>
      </View>

      <Text className="text-[22px] font-black text-white uppercase tracking-tight text-center mb-3">
        Error de autenticación
      </Text>
      <Text className="text-sm text-zinc-400 text-center leading-relaxed mb-8 max-w-[300px]">
        {errorMessage || 'No se pudo verificar tu sesión. Intenta iniciar sesión manualmente.'}
      </Text>

      <Pressable
        onPress={() => router.replace('/login')}
        className="bg-tad-yellow rounded-2xl py-5 px-8 items-center justify-center active:opacity-80"
      >
        <Text className="text-tad-dark font-black uppercase tracking-[0.15em] text-sm">
          IR A INICIAR SESIÓN
        </Text>
      </Pressable>
    </View>
  );
}
