/**
 * WalletTab — Vista de Billetera (Finanzas)
 *
 * Muestra:
 *   - Balance card con streak badge
 *   - Monthly projected earnings
 *   - Referral stats (referredAdvertisers, referredDrivers)
 *   - Earnings breakdown: min(activeAds, 15) * 500 formula
 *   - Withdrawal progress (RD$5000 target)
 *   - Quick stats (Este Mes, Referidos, Bonos)
 *
 * Uses hubData from useDriverHub. No separate walletState needed.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing, Animation } from '../../styles/theme';
import type { DriverHubData } from './HomeTab';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletTabProps {
  hubData: DriverHubData | null;
  hubLoading: boolean;
  isLocalMode: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAY_PER_UNIT_RD = 500;
const NEXT_WITHDRAWAL_TARGET = 5000;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.caption,
    color: Colors.zinc500,
    letterSpacing: 2.5,
  },
  sectionSubtitle: {
    ...Typography.body,
    color: Colors.zinc300,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  offlineBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.40)',
    backgroundColor: 'rgba(245,158,11,0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  offlineBannerText: {
    ...Typography.body,
    color: Colors.amber300,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
  },
  balanceCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,212,0,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    overflow: 'hidden',
  },
  balanceLabel: {
    ...Typography.caption,
    color: Colors.yellow,
    letterSpacing: 2,
    fontSize: 10,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    marginTop: Spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.20)',
    backgroundColor: 'rgba(249,115,22,0.10)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
  },
  streakText: {
    ...Typography.caption,
    color: Colors.amber300,
    letterSpacing: 3,
  },
  withdrawalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  withdrawalLabelSmall: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.zinc500,
    letterSpacing: 2.5,
  },
  withdrawalLabelGold: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.yellow,
    letterSpacing: 2.5,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
    marginTop: Spacing.md,
  },
  withdrawButtonActive: {
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 6,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#27272a',
  },
  withdrawButtonTextActive: {
    ...Typography.caption,
    color: Colors.black,
    letterSpacing: 2.5,
  },
  withdrawButtonTextDisabled: {
    ...Typography.caption,
    color: '#52525b',
    letterSpacing: 2.5,
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
    letterSpacing: 2.5,
    fontSize: 8,
  },
  quickStatValue: {
    ...Typography.label,
    color: Colors.white,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  activityTitle: {
    ...Typography.caption,
    color: Colors.zinc500,
    letterSpacing: 2,
  },
  emptyActivity: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivityText: {
    ...Typography.body,
    color: Colors.zinc500,
    fontWeight: '700',
  },
  formulaText: {
    ...Typography.body,
    color: Colors.zinc300,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});

// ─── Component ─────────────────────────────────────────────────────────────────

export const WalletTab: React.FC<WalletTabProps> = ({
  hubData,
  hubLoading,
  isLocalMode,
}) => {
  const balance = hubData?.balance ?? 0;
  const projectedEarnings = hubData?.projectedEarnings ?? 0;
  const activeAds = hubData?.activeAds ?? 0;
  const referredAdvertisers = hubData?.referredAdvertisers ?? 0;
  const referredDrivers = hubData?.referredDrivers ?? 0;
  const streak = hubData?.activeDaysStreak ?? 0;

  const withdrawalProgress = Math.min(100, (balance / NEXT_WITHDRAWAL_TARGET) * 100);
  const canWithdraw = withdrawalProgress >= 100;

  // Earnings breakdown: min(activeAds, 15) * 500 + referredAdvertisers * 500 + referredDrivers * 500
  const adEarnings = Math.min(activeAds, 15) * PAY_PER_UNIT_RD;
  const refAdvEarnings = referredAdvertisers * PAY_PER_UNIT_RD;
  const refDrvEarnings = referredDrivers * PAY_PER_UNIT_RD;
  const totalEarnings = adEarnings + refAdvEarnings + refDrvEarnings;

  // Animated progress bar
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: withdrawalProgress,
      duration: Animation.slow,
      useNativeDriver: false, // width can't use native driver
    }).start();
  }, [withdrawalProgress, progressAnim]);

  const quickStats = [
    {
      label: 'Este Mes',
      value: `RD$${projectedEarnings.toLocaleString('es-DO')}`,
      icon: 'trending-up-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.green,
    },
    {
      label: 'Referidos',
      value: `RD$${(referredAdvertisers * PAY_PER_UNIT_RD).toLocaleString('es-DO')}`,
      icon: 'target-outline' as keyof typeof Ionicons.glyphMap,
      color: '#3b82f6',
    },
    {
      label: 'Bonos',
      value: `RD$${totalEarnings.toLocaleString('es-DO')}`,
      icon: 'flame-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.amber500,
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View>
        <Text style={styles.sectionTitle}>FINANZAS</Text>
        <Text style={styles.sectionSubtitle}>Mi Billetera</Text>
      </View>

      {/* Offline Banner */}
      {isLocalMode && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚠️ Mostrando datos en caché (modo local)
          </Text>
        </View>
      )}

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        {/* Gold glow decoration */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 128,
            height: 128,
            borderRadius: 64,
            backgroundColor: Colors.yellow,
            opacity: 0.15,
          }}
        />

        <Text style={styles.balanceLabel}>BALANCE DISPONIBLE</Text>
        <Text style={styles.balanceAmount}>
          RD${balance.toLocaleString('es-DO')}
        </Text>
        <Text style={styles.formulaText}>
          Total = (Ads × 500) + (Anunciantes × 500) + (Conductores × 500)
        </Text>

        {/* Streak Badge */}
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame-outline" size={16} color={Colors.amber500} />
            <Text style={styles.streakText}>{streak} DÍAS CONSECUTIVOS</Text>
          </View>
        )}

        {/* Withdrawal Progress */}
        <View style={styles.withdrawalLabelRow}>
          <Text style={styles.withdrawalLabelSmall}>META PARA RETIRO</Text>
          <Text style={styles.withdrawalLabelGold}>
            RD${NEXT_WITHDRAWAL_TARGET.toLocaleString('es-DO')}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: canWithdraw ? Colors.green : Colors.yellow,
              },
            ]}
          />
        </View>

        {canWithdraw && (
          <Text
            style={{
              fontSize: 9,
              fontWeight: '900',
              color: Colors.green,
              letterSpacing: 2.5,
              marginTop: Spacing.xs,
            }}
          >
            ¡META ALCANZADA! Puedes retirar
          </Text>
        )}

        {/* Withdraw Button */}
        <Pressable
          disabled={!canWithdraw}
          style={[
            styles.withdrawButton,
            canWithdraw ? styles.withdrawButtonActive : styles.withdrawButtonDisabled,
          ]}
        >
          <Ionicons
            name="arrow-up-right-outline"
            size={16}
            color={canWithdraw ? Colors.black : '#52525b'}
          />
          <Text style={canWithdraw ? styles.withdrawButtonTextActive : styles.withdrawButtonTextDisabled}>
            RETIRAR
          </Text>
        </Pressable>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsGrid}>
        {quickStats.map((stat, i) => (
          <View key={i} style={styles.quickStatCard}>
            <Ionicons name={stat.icon} size={16} color={stat.color} />
            <Text style={styles.quickStatLabel}>{stat.label}</Text>
            <Text style={styles.quickStatValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {/* Earnings Breakdown */}
      <View style={[styles.balanceCard, { borderRadius: 24, borderColor: 'rgba(255,255,255,0.06)' }]}>
        <Text style={styles.sectionTitle}>DESGLOSE DE GANANCIAS</Text>

        <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
          <EarningsRow
            label={`Pautas Activas (${Math.min(activeAds, 15)} de 15)`}
            value={`RD$${adEarnings.toLocaleString('es-DO')}`}
            color={Colors.yellow}
          />
          <EarningsRow
            label={`Ref. Anunciantes (${referredAdvertisers})`}
            value={`RD$${refAdvEarnings.toLocaleString('es-DO')}`}
            color="#3b82f6"
          />
          <EarningsRow
            label={`Ref. Conductores (${referredDrivers})`}
            value={`RD$${refDrvEarnings.toLocaleString('es-DO')}`}
            color={Colors.amber500}
          />

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.06)',
              paddingTop: Spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...Typography.body, color: Colors.white, fontWeight: '700' }}>
              Total Estimado
            </Text>
            <Text style={{ ...Typography.subheading, color: Colors.yellow, fontWeight: '900' }}>
              RD${totalEarnings.toLocaleString('es-DO')}
            </Text>
          </View>
        </View>
      </View>

      {/* Activity Recent (placeholder) */}
      <View>
        <Text style={styles.activityTitle}>ACTIVIDAD RECIENTE</Text>
        <View style={[styles.emptyActivity, { marginTop: Spacing.sm }]}>
          <Ionicons name="time-outline" size={24} color={Colors.zinc500} />
          <Text style={styles.emptyActivityText}>
            No hay transacciones recientes
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

// ─── EarningsRow helper ────────────────────────────────────────────────────────

function EarningsRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ ...Typography.body, color: Colors.zinc300, fontSize: 13 }}>{label}</Text>
      <Text style={{ ...Typography.label, color, fontWeight: '900' }}>{value}</Text>
    </View>
  );
}

export default WalletTab;
