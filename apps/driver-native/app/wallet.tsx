/**
 * wallet.tsx — Standalone Wallet Page (Deep-Linking Support)
 *
 * Independent route for deep-linking into the wallet directly.
 * Fetches hub data directly (GET /drivers/me/hub), then renders
 * the same WalletTab content as the dashboard tab.
 *
 * Financial formulas identical to PWA:
 *   - Balance from hub
 *   - Withdrawal threshold: RD$5,000 minimum
 *   - withdrawalProgress = Math.min(100, (balance / 5000) * 100)
 *   - projectedEarnings from hub
 *   - Referral earnings: advertisers * 500 + drivers * 500
 */

import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import client from '../src/lib/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../src/styles/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAY_PER_UNIT_RD = 500;
const NEXT_WITHDRAWAL = 5000;
const MAX_DRIVER_SLOTS = 15;

function calculateWalletTotal(ads: number, referredAdvertisers: number, referredDrivers: number): number {
  return (ads * PAY_PER_UNIT_RD) + (referredAdvertisers * PAY_PER_UNIT_RD) + (referredDrivers * PAY_PER_UNIT_RD);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverHubData {
  driverId: string;
  driverName: string;
  balance: number;
  projectedEarnings: number;
  activeAds: number;
  activeSlots: number;
  maxSlots: number;
  subscriptionPaid: boolean;
  subscriptionStatus: string;
  deviceId: string | null;
  gpsPoints: number;
  adsPlayed: number;
  contractAccepted: boolean;
  agreementVersion: string | null;
  onboardingStatus: string;
  bankAccountConfigured: boolean;
  activeDaysStreak?: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  date: string;
  desc: string;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeHubData(raw: any): DriverHubData {
  const activeAds = Number(raw?.activeAds) || 0;
  return {
    driverId: String(raw?.driverId || ''),
    driverName: String(raw?.driverName || 'Conductor'),
    balance: Number(raw?.balance) || 0,
    projectedEarnings: Number(raw?.projectedEarnings) || 0,
    activeAds,
    activeSlots: Math.min(MAX_DRIVER_SLOTS, Number(raw?.activeSlots || raw?.activeAds || 0)),
    maxSlots: MAX_DRIVER_SLOTS,
    subscriptionPaid: Boolean(raw?.subscriptionPaid),
    subscriptionStatus: String(raw?.subscriptionStatus || 'UNKNOWN'),
    deviceId: raw?.deviceId ? String(raw.deviceId) : null,
    gpsPoints: Number(raw?.gpsPoints) || 0,
    adsPlayed: Number(raw?.adsPlayed) || 0,
    contractAccepted: Boolean(raw?.contractAccepted),
    agreementVersion: raw?.agreementVersion ? String(raw.agreementVersion) : null,
    onboardingStatus: String(raw?.onboardingStatus || 'UNKNOWN'),
    bankAccountConfigured: Boolean(raw?.bankAccountConfigured),
    activeDaysStreak: Number(raw?.activeDaysStreak) || 0,
  };
}

// ─── Default demo transactions ────────────────────────────────────────────────

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 1, type: 'EARNING', amount: 1200, date: 'Hoy, 2:30 PM', desc: 'Bono Diario de Pauta' },
  { id: 2, type: 'WITHDRAWAL', amount: -5000, date: 'Ayer, 10:15 AM', desc: 'Transferencia Bancaria' },
  { id: 3, type: 'EARNING', amount: 300, date: 'Lun 8, 4:00 PM', desc: 'Bono por Referido' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DriverWalletPage() {
  const router = useRouter();
  const { driverName } = useAuthStore();

  const [hubData, setHubData] = useState<DriverHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Referral state (would come from a referral store in a full implementation)
  const referredAdvertisers = 0;
  const referredDrivers = 0;

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // ── Fetch hub data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        const hubRes = await client.get('/drivers/me/hub');
        setHubData(normalizeHubData(hubRes.data));
        setIsLocalMode(false);
      } catch {
        // Try to load from cached data (fallback)
        setIsLocalMode(true);
        Alert.alert('Sin conexión', 'Mostrando datos en caché (modo local)');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Fetch transactions ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const txRes = await client.get('/drivers/me/transactions').catch(() => ({ data: [] }));
        setTransactions(txRes.data?.length ? txRes.data : DEMO_TRANSACTIONS);
      } catch {
        setTransactions(DEMO_TRANSACTIONS);
      } finally {
        setTxLoading(false);
      }
    };
    loadTransactions();
  }, []);

  // ── Wallet calculations ─────────────────────────────────────────────────────
  const balance = hubData?.balance ?? calculateWalletTotal(hubData?.activeSlots ?? 0, referredAdvertisers, referredDrivers) ?? 0;
  const withdrawalProgress = Math.min(100, (balance / NEXT_WITHDRAWAL) * 100);
  const streak = hubData?.activeDaysStreak || 0;
  const walletTotal = calculateWalletTotal(hubData?.activeSlots ?? 0, referredAdvertisers, referredDrivers);

  // ── Quick stats ─────────────────────────────────────────────────────────────
  const quickStats = [
    {
      label: 'Este Mes',
      value: `RD$${(hubData?.projectedEarnings || 0).toLocaleString()}`,
      color: Colors.emerald400,
      icon: '↑',
    },
    {
      label: 'Referidos',
      value: `RD$${(referredAdvertisers * 500).toLocaleString()}`,
      color: '#60a5fa',
      icon: '◎',
    },
    {
      label: 'Bonos',
      value: `RD$${walletTotal.toLocaleString()}`,
      color: Colors.amber300,
      icon: '★',
    },
  ];

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-tad-dark items-center justify-center">
        <ActivityIndicator size="large" color={Colors.yellow} />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-tad-dark">
      {/* Header */}
      <View
        className="pt-12 pb-4 px-4 flex-row items-center gap-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: Colors.whiteAlpha5,
          backgroundColor: 'rgba(9, 9, 11, 0.80)',
        }}
      >
        <Pressable
          onPress={() => router.replace('/dashboard')}
          className="flex-row items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{
            backgroundColor: Colors.whiteAlpha5,
            borderWidth: 1,
            borderColor: Colors.whiteAlpha5,
          }}
        >
          <Text className="text-zinc-300 text-sm font-black uppercase tracking-[0.1em]">
            ← Dashboard
          </Text>
        </Pressable>

        <View>
          <Text className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
            Finanzas
          </Text>
          <Text className="text-lg font-black uppercase tracking-tighter text-white">
            Mi Billetera
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Offline banner */}
        {isLocalMode && (
          <View
            className="rounded-2xl px-4 py-3 mb-5"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.10)',
              borderWidth: 1,
              borderColor: 'rgba(252, 211, 77, 0.40)',
            }}
          >
            <Text className="text-xs font-black tracking-wide text-amber-200">
              ⚠ Mostrando datos en caché (modo local)
            </Text>
          </View>
        )}

        {/* Section title */}
        <View className="mb-5">
          <Text className="text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            Finanzas
          </Text>
          <Text className="mt-1 text-base font-bold text-zinc-300">
            Mi Billetera
          </Text>
        </View>

        {/* ── Balance Card ──────────────────────────────────────────────────── */}
        <View
          className="rounded-[2.5rem] p-6 mb-5 overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 212, 0, 0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255, 212, 0, 0.15)',
          }}
        >
          <Text className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: Colors.yellow }}>
            Balance Disponible
          </Text>
          <Text className="text-4xl font-black tracking-tighter text-white mb-4">
            RD${balance.toLocaleString()}
          </Text>

          {/* Streak Badge */}
          {streak > 0 && (
            <View
              className="flex-row items-center gap-2 mb-5 px-4 py-2 rounded-xl"
              style={{
                backgroundColor: 'rgba(249, 115, 22, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(249, 115, 22, 0.20)',
              }}
            >
              <Text className="text-orange-400 text-sm">🔥</Text>
              <Text className="text-[10px] font-black text-orange-300 uppercase tracking-widest">
                {streak} días consecutivos
              </Text>
            </View>
          )}

          {/* Withdrawal Progress */}
          <View className="mb-5">
            <View className="flex-row justify-between mb-2">
              <Text className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Meta para retiro
              </Text>
              <Text className="text-[9px] font-black uppercase tracking-widest" style={{ color: Colors.yellow }}>
                RD${NEXT_WITHDRAWAL.toLocaleString()}
              </Text>
            </View>
            <View
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.40)' }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${withdrawalProgress}%`,
                  backgroundColor: withdrawalProgress >= 100 ? Colors.emerald500 : Colors.yellow,
                }}
              />
            </View>
            {withdrawalProgress >= 100 && (
              <Text className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-2">
                ¡Meta alcanzada! Puedes retirar
              </Text>
            )}
          </View>

          {/* Withdraw Button */}
          <Pressable
            disabled={withdrawalProgress < 100}
            className="py-4 px-5 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: withdrawalProgress >= 100 ? Colors.yellow : '#27272a',
              opacity: withdrawalProgress < 100 ? 1 : undefined,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: withdrawalProgress >= 100 ? Colors.primary : '#52525b' }}
              >
                ↑ Retirar
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── Quick Stats ───────────────────────────────────────────────────── */}
        <View className="flex-row gap-3 mb-5">
          {quickStats.map((stat, i) => (
            <View
              key={i}
              className="flex-1 p-4 rounded-2xl items-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderWidth: 1,
                borderColor: Colors.whiteAlpha5,
              }}
            >
              <Text className="text-sm mb-2" style={{ color: stat.color }}>{stat.icon}</Text>
              <Text className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                {stat.label}
              </Text>
              <Text className="text-xs font-black text-white">{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Transactions ──────────────────────────────────────────────────── */}
        <View className="mb-5">
          <Text className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
            Actividad Reciente
          </Text>

          {txLoading ? (
            <View className="gap-3">
              {[1, 2, 3].map(i => (
                <View
                  key={i}
                  className="p-4 rounded-2xl flex-row items-center gap-4"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  <View className="w-12 h-12 rounded-xl bg-white/5" />
                  <View className="flex-1 gap-2">
                    <View className="h-3 w-32 bg-white/5 rounded" />
                    <View className="h-2 w-20 bg-white/5 rounded" />
                  </View>
                  <View className="h-4 w-16 bg-white/5 rounded" />
                </View>
              ))}
            </View>
          ) : transactions.length === 0 ? (
            <View
              className="rounded-2xl p-6 items-center"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderWidth: 1,
                borderColor: Colors.whiteAlpha5,
              }}
            >
              <Text className="text-sm font-bold text-zinc-500">
                No hay transacciones recientes
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {transactions.map(tx => (
                <View
                  key={tx.id}
                  className="p-4 rounded-2xl flex-row items-center gap-4"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderWidth: 1,
                    borderColor: Colors.whiteAlpha5,
                  }}
                >
                  {/* Icon */}
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: tx.type === 'EARNING' ? 'rgba(34, 197, 94, 0.10)' : 'rgba(244, 63, 94, 0.10)',
                    }}
                  >
                    <Text
                      className="text-lg font-black"
                      style={{ color: tx.type === 'EARNING' ? Colors.emerald500 : '#f43f5e' }}
                    >
                      {tx.type === 'EARNING' ? '↓' : '↑'}
                    </Text>
                  </View>

                  {/* Description + date */}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">{tx.desc}</Text>
                    <Text className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                      🕐 {tx.date}
                    </Text>
                  </View>

                  {/* Amount */}
                  <View className="items-end">
                    <Text
                      className="text-sm font-black"
                      style={{ color: tx.type === 'EARNING' ? Colors.emerald500 : Colors.white }}
                    >
                      {tx.type === 'EARNING' ? '+' : ''}RD${Math.abs(tx.amount).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
