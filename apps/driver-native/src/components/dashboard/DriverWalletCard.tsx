/**
 * DriverWalletCard — Wallet summary card with balance + slot usage
 *
 * Shows:
 *   - Balance display (RD$ formatted)
 *   - Active ads / max slots (15) bar
 *   - calculateWalletTotal: (ads * 500) + (refAdv * 500) + (refDrv * 500)
 *   - Live sync / Offline cache badge
 *   - 3 stat cells: Ads Activos, Ref. Anunciantes, Ref. Conductores
 *   - Skeleton loading variant
 *
 * Used inside HomeTab and can also be used in WalletTab.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing, Animation } from '../../styles/theme';
import type { DriverHubData } from './HomeTab';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverWalletCardProps {
  hubData: DriverHubData | null;
  loading: boolean;
  isLocalMode: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const PAY_PER_UNIT_RD = 500;
const MAX_SLOTS = 15;

// ─── calculateWalletTotal ──────────────────────────────────────────────────────

export function calculateWalletTotal(
  ads: number,
  referredAdvertisers: number,
  referredDrivers: number
): number {
  return (
    (ads * PAY_PER_UNIT_RD) +
    (referredAdvertisers * PAY_PER_UNIT_RD) +
    (referredDrivers * PAY_PER_UNIT_RD)
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.zinc300,
  },
  statusBadge: {
    ...Typography.caption,
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
  formulaText: {
    ...Typography.body,
    color: Colors.zinc300,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statCell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.20)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.zinc400,
    letterSpacing: 1.5,
    fontSize: 10,
  },
  statValue: {
    ...Typography.subheading,
    color: Colors.white,
    fontWeight: '900',
    marginTop: Spacing.xs,
  },
  slotsBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#171717',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  slotsFill: {
    height: '100%',
    borderRadius: 4,
  },
  slotsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  slotsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.zinc500,
    letterSpacing: 2,
  },
  slotsHighlight: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.yellow,
  },
  // Skeleton styles
  skeletonCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  skeletonRow: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  skeletonBigRow: {
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginTop: Spacing.md,
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  skeletonCell: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
});

// ─── Skeleton Component ────────────────────────────────────────────────────────

export function DriverWalletCardSkeleton() {
  const shimmerAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.6,
          duration: Animation.shimmer,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: Animation.shimmer,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerAnim }]}>
      <View style={[styles.skeletonRow, { width: 96 }]} />
      <View style={styles.skeletonBigRow} />
      <View style={styles.skeletonGrid}>
        <View style={styles.skeletonCell} />
        <View style={styles.skeletonCell} />
        <View style={styles.skeletonCell} />
      </View>
    </Animated.View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const DriverWalletCard: React.FC<DriverWalletCardProps> = ({
  hubData,
  loading,
  isLocalMode,
}) => {
  if (loading || !hubData) {
    return <DriverWalletCardSkeleton />;
  }

  const activeAds = hubData.activeAds ?? 0;
  const referredAdvertisers = hubData.referredAdvertisers ?? 0;
  const referredDrivers = hubData.referredDrivers ?? 0;
  const slotsUsed = hubData.activeSlots ?? 0;
  const maxSlots = hubData.maxSlots ?? MAX_SLOTS;

  const total = calculateWalletTotal(activeAds, referredAdvertisers, referredDrivers);
  const slotsPct = maxSlots > 0 ? Math.min(100, Math.round((slotsUsed / maxSlots) * 100)) : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>DRIVER WALLET</Text>
        <Text
          style={[
            styles.statusBadge,
            { color: isLocalMode ? Colors.amber300 : Colors.emerald400 },
          ]}
        >
          {isLocalMode ? 'OFFLINE CACHE' : 'LIVE SYNC'}
        </Text>
      </View>

      {/* Balance */}
      <Text style={styles.balanceAmount}>
        RD${total.toLocaleString('es-DO')}
      </Text>
      <Text style={styles.formulaText}>
        Total = (Ads × 500) + (Anunciantes × 500) + (Conductores × 500)
      </Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>ADS ACTIVOS</Text>
          <Text style={styles.statValue}>{activeAds}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>REF. ANUNCIANTES</Text>
          <Text style={styles.statValue}>{referredAdvertisers}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>REF. CONDUCTORES</Text>
          <Text style={styles.statValue}>{referredDrivers}</Text>
        </View>
      </View>

      {/* Slots Usage Bar */}
      <View style={styles.slotsBar}>
        <View
          style={[
            styles.slotsFill,
            {
              width: `${slotsPct}%`,
              backgroundColor: slotsPct >= 100 ? Colors.green : Colors.amber500,
            },
          ]}
        />
      </View>
      <View style={styles.slotsInfo}>
        <Text style={styles.slotsLabel}>{slotsUsed} de {maxSlots} slots</Text>
        <Text style={styles.slotsHighlight}>
          {slotsPct}% ocupado
        </Text>
      </View>
    </View>
  );
};

export default DriverWalletCard;
