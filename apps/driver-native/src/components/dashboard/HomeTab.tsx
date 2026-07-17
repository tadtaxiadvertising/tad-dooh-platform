/**
 * HomeTab — Vista principal del dashboard del conductor
 *
 * Muestra:
 *   - Banner de modo local (si red inestable)
 *   - Banner de estado del servicio (online/syncing/offline)
 *   - Saludo con nombre del conductor
 *   - DriverWalletCard (balance + slots)
 *   - Quick stats (ads activos, slots, ganancias proyectadas)
 *
 * Todo contenido dentro de contenedores stitched-card.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing, Animation } from '../../styles/theme';
import { DriverWalletCard } from './DriverWalletCard';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal DriverHubData interface matching PWA + native dashboard expectations */
export interface DriverHubData {
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
  referredAdvertisers?: number;
  referredDrivers?: number;
  activeDaysStreak?: number;
}

interface BackgroundTelemetryReturn {
  connectionStatus: 'online' | 'offline' | 'syncing';
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  isBackgrounded: boolean;
  syncPending: () => Promise<{ processed: number; remaining: number; success: boolean }>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

interface HomeTabProps {
  hubData: DriverHubData | null;
  hubLoading: boolean;
  isLocalMode: boolean;
  telemetry: BackgroundTelemetryReturn;
  driverName: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  localModeBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.40)',
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  localModeText: {
    ...Typography.body,
    color: Colors.amber300,
    fontWeight: '800',
    letterSpacing: 1,
  },
  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  serviceBannerText: {
    ...Typography.caption,
    letterSpacing: 2.5,
    fontSize: 10,
  },
  greetingCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greetingLabel: {
    ...Typography.caption,
    color: Colors.zinc500,
    letterSpacing: 2.5,
  },
  greetingName: {
    ...Typography.heading,
    color: Colors.white,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickStatCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flex: 1,
    alignItems: 'center',
  },
  quickStatLabel: {
    ...Typography.caption,
    color: Colors.zinc500,
    letterSpacing: 1.5,
    fontSize: 9,
  },
  quickStatValue: {
    ...Typography.subheading,
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  footerText: {
    ...Typography.caption,
    color: '#52525b',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  debugInfo: {
    ...Typography.label,
    fontFamily: 'monospace',
    color: '#3f3f46',
    textAlign: 'center',
    fontSize: 9,
  },
});

// ─── PulseDot (native equivalent of PWA dashboard-utils) ──────────────────────

function PulseDot({ color }: { color: string }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: Animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: Animation.normal,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          opacity: pulseAnim,
        }}
      />
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 3,
        }}
      />
    </View>
  );
}

// ─── Service Banner Config ────────────────────────────────────────────────────

function getServiceBannerConfig(status: string) {
  switch (status) {
    case 'offline':
      return {
        label: 'MODO OFFLINE: Guardando local y reintentando en segundo plano',
        color: Colors.amber500,
        bg: '#2a1405',
        border: '#ea580c',
      };
    case 'syncing':
      return {
        label: 'SINCRONIZANDO TELEMETRÍA...',
        color: Colors.yellow,
        bg: '#1a1400',
        border: Colors.yellow,
      };
    default:
      return {
        label: 'SERVICIO ACTIVO: PUBLICIDAD EN CURSO',
        color: Colors.green,
        bg: '#052e16',
        border: Colors.green,
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const HomeTab: React.FC<HomeTabProps> = ({
  hubData,
  hubLoading,
  isLocalMode,
  telemetry,
  driverName,
}) => {
  const bannerConfig = getServiceBannerConfig(telemetry.connectionStatus);
  const activeAds = hubData?.activeAds ?? 0;
  const slotsUsed = hubData?.activeSlots ?? 0;
  const maxSlots = hubData?.maxSlots ?? 15;
  const projectedEarnings = hubData?.projectedEarnings ?? 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing.lg, paddingBottom: Spacing.xxl }}
    >
      {/* Local Mode Banner */}
      {isLocalMode && (
        <View style={styles.localModeBanner}>
          <Text style={styles.localModeText}>
            ⚠️ Operando en Modo Local (Red Inestable)
          </Text>
        </View>
      )}

      {/* Service Status Banner */}
      <View
        style={[
          styles.serviceBanner,
          {
            backgroundColor: bannerConfig.bg,
            borderColor: bannerConfig.border,
            borderWidth: 1,
          },
        ]}
      >
        <PulseDot color={bannerConfig.color} />
        <Text style={[styles.serviceBannerText, { color: bannerConfig.color }]}>
          {bannerConfig.label}
        </Text>
      </View>

      {/* Greeting Card */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingLabel}>CONDUCTOR</Text>
        <Text style={styles.greetingName}>
          ¡Hola, {driverName}!
        </Text>
      </View>

      {/* Wallet Card */}
      <DriverWalletCard
        hubData={hubData}
        loading={hubLoading}
        isLocalMode={isLocalMode}
      />

      {/* Quick Stats */}
      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStatCard}>
          <Ionicons name="megaphone-outline" size={16} color={Colors.yellow} />
          <Text style={styles.quickStatLabel}>ADS ACTIVOS</Text>
          <Text style={styles.quickStatValue}>{activeAds}</Text>
        </View>

        <View style={styles.quickStatCard}>
          <Ionicons name="grid-outline" size={16} color={Colors.amber500} />
          <Text style={styles.quickStatLabel}>SLOTS</Text>
          <Text style={styles.quickStatValue}>
            {slotsUsed}/{maxSlots}
          </Text>
        </View>

        <View style={styles.quickStatCard}>
          <Ionicons name="trending-up-outline" size={16} color={Colors.green} />
          <Text style={styles.quickStatLabel}>GANANCIAS</Text>
          <Text style={styles.quickStatValue}>
            RD${projectedEarnings.toLocaleString('es-DO')}
          </Text>
        </View>
      </View>

      {/* Earnings Ledger */}
      <EarningsLedger
        current={hubData?.balance ?? 0}
        max={7500}
        slotsUsed={slotsUsed}
        totalSlots={maxSlots}
      />

      {/* Footer */}
      <View style={{ paddingTop: Spacing.lg }}>
        <Text style={styles.footerText}>TAD DOOH Platform v12.0.0</Text>
        <Text style={styles.debugInfo}>
          GPS: {telemetry.isTracking ? 'ACTIVO' : 'INACTIVO'} · Batch: {telemetry.batchCount}/10 · Red: {telemetry.connectionStatus.toUpperCase()}
        </Text>
      </View>
    </ScrollView>
  );
};

// ─── EarningsLedger (inline, matching PWA DriverShell) ────────────────────────

function EarningsLedger({
  current,
  max,
  slotsUsed,
  totalSlots,
}: {
  current: number;
  max: number;
  slotsUsed: number;
  totalSlots: number;
}) {
  const pctIncome = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const pctSlots = totalSlots > 0 ? Math.min(100, Math.round((slotsUsed / totalSlots) * 100)) : 0;
  const remaining = Math.max(0, max - current);
  const filledSlots = Math.max(0, Math.min(totalSlots, slotsUsed));

  const ledgerStyles = StyleSheet.create({
    card: {
      ...GlassmorphismStyles.stitchedCard as any,
      borderRadius: 24,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    sectionLabel: {
      ...Typography.caption,
      color: '#737373',
      letterSpacing: 2.5,
    },
    bigNumber: {
      fontSize: 32,
      fontWeight: '900',
      color: Colors.white,
      letterSpacing: -1,
    },
    subInfo: {
      ...Typography.body,
      color: Colors.zinc500,
      marginTop: Spacing.xs,
    },
    subInfoBold: {
      fontWeight: '700',
      color: Colors.zinc300,
    },
    slotHighlight: {
      fontWeight: '700',
      color: Colors.yellow,
    },
    progressTrack: {
      width: '100%',
      height: 12,
      backgroundColor: '#171717',
      borderWidth: 1,
      borderColor: '#262626',
      borderRadius: 6,
      overflow: 'hidden',
      marginTop: Spacing.md,
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
    },
    progressFillSlots: {
      height: '100%',
      borderRadius: 6,
    },
    slotDotsRow: {
      flexDirection: 'row',
      gap: 2,
      marginTop: Spacing.sm,
    },
    slotDot: {
      flex: 1,
      height: 6,
      borderRadius: 3,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    footerText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#52525b',
      letterSpacing: 2.5,
    },
    footerHighlight: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.zinc400,
      letterSpacing: 2.5,
    },
    remainingText: {
      ...Typography.body,
      color: Colors.zinc500,
      fontWeight: '600',
      marginTop: Spacing.sm,
    },
  });

  return (
    <View style={ledgerStyles.card}>
      <Text style={ledgerStyles.sectionLabel}>GANANCIAS DEL MES</Text>
      <Text style={ledgerStyles.bigNumber}>
        RD${current.toLocaleString('es-DO')}
      </Text>
      <Text style={ledgerStyles.subInfo}>
        Tope: <Text style={ledgerStyles.subInfoBold}>RD${max.toLocaleString('es-DO')}</Text>
        <Text style={{ color: '#3f3f46' }}> ({totalSlots} slots max)</Text>
      </Text>
      <Text style={ledgerStyles.subInfo}>
        Slots: <Text style={ledgerStyles.slotHighlight}>{slotsUsed}/{totalSlots}</Text>
      </Text>

      {/* Income progress bar */}
      <View style={ledgerStyles.progressTrack}>
        <View
          style={[
            ledgerStyles.progressFill,
            {
              width: `${pctIncome}%`,
              backgroundColor: Colors.yellow,
            },
          ]}
        />
      </View>

      {/* Slots progress bar */}
      <View style={[ledgerStyles.progressTrack, { height: 8, marginTop: Spacing.sm }]}>
        <View
          style={[
            ledgerStyles.progressFillSlots,
            {
              width: `${pctSlots}%`,
              backgroundColor: Colors.amber500,
            },
          ]}
        />
      </View>

      {/* Slot dot indicators */}
      <View style={ledgerStyles.slotDotsRow}>
        {Array.from({ length: totalSlots }).map((_, i) => (
          <View
            key={i}
            style={[
              ledgerStyles.slotDot,
              {
                backgroundColor: i < filledSlots ? Colors.yellow : '#262626',
              },
            ]}
          />
        ))}
      </View>

      <View style={ledgerStyles.footerRow}>
        <Text style={ledgerStyles.footerText}>0 slots</Text>
        <Text style={ledgerStyles.footerHighlight}>
          Ingresos {pctIncome}% · Slots {filledSlots}/{totalSlots}
        </Text>
        <Text style={ledgerStyles.footerText}>{totalSlots} slots</Text>
      </View>

      <Text style={ledgerStyles.remainingText}>
        Faltan <Text style={{ color: Colors.yellow, fontWeight: '700' }}>
          RD${remaining.toLocaleString('es-DO')}
        </Text> para RD${max.toLocaleString('es-DO')}
      </Text>
    </View>
  );
}

export default HomeTab;
