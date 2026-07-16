/**
 * RoutesTab — Vista de Rutas / Mapa de Telemetría
 *
 * Muestra estadísticas en vivo del GPS del conductor:
 *   - Tracking status (active/inactive)
 *   - Batch count y offline count
 *   - Connection status indicator
 *   - Botón manual sync
 *   - Decorative map preview con grid overlay y glow pulsante
 *
 * Totalmente estática (no requiere Leaflet ni librerías externas).
 * Los datos en vivo vienen del hook useBackgroundTelemetry.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing, Animation } from '../../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface BackgroundTelemetryReturn {
  connectionStatus: ConnectionStatus;
  batchCount: number;
  offlineCount: number;
  isTracking: boolean;
  isBackgrounded: boolean;
  syncPending: () => Promise<{ processed: number; remaining: number; success: boolean }>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

interface RoutesTabProps {
  telemetry: BackgroundTelemetryReturn;
}

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
  mapPreview: {
    height: 192,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    position: 'relative',
  },
  mapGradient: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  mapCenterPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,212,0,0.20)',
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 6,
  },
  mapStatusStrip: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(0,0,0,0.40)',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    ...Typography.caption,
    letterSpacing: 1.5,
    color: Colors.zinc400,
    fontSize: 10,
  },
  batchLabel: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#52525b',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.zinc500,
    letterSpacing: 1.5,
    fontSize: 10,
  },
  statValue: {
    ...Typography.label,
    fontWeight: '900',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  syncButtonText: {
    ...Typography.label,
    color: Colors.zinc300,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
});

// ─── Scan Line Animation (native equivalent of CSS animate-map-scan) ──────────

function ScanLine() {
  const scanAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 192,
        duration: Animation.shimmer,
        useNativeDriver: true,
      })
    ).start();
  }, [scanAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,212,0,0.20)',
        transform: [{ translateY: scanAnim }],
      }}
    />
  );
}

// ─── Glow Pulse Animation ─────────────────────────────────────────────────────

function GlowPulse() {
  const glowAnim = React.useRef(new Animated.Value(0.1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: Animation.slow,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.1,
          duration: Animation.slow,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -30,
        marginTop: -30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.yellow,
        opacity: glowAnim,
      }}
    />
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const RoutesTab: React.FC<RoutesTabProps> = ({ telemetry }) => {
  const [syncingNow, setSyncingNow] = useState(false);

  const { connectionStatus, batchCount, offlineCount, isTracking } = telemetry;
  const isOffline = connectionStatus === 'offline';
  const isSyncing = connectionStatus === 'syncing';

  const handleSync = async () => {
    setSyncingNow(true);
    try {
      await telemetry.syncPending();
    } finally {
      setSyncingNow(false);
    }
  };

  const statusLabel = isOffline
    ? 'Sin conexión'
    : isSyncing
      ? 'Sincronizando...'
      : isTracking
        ? 'Rastreo activo'
        : 'GPS detenido';

  const statusDotColor = isOffline
    ? Colors.red
    : isSyncing
      ? Colors.yellow
      : Colors.green;

  const stats = [
    {
      label: 'Tracking',
      value: isTracking ? 'ACTIVO' : 'INACTIVO',
      color: isTracking ? Colors.green : '#52525b',
      icon: 'pulse-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      label: 'Batch GPS',
      value: `${batchCount}/10`,
      color: Colors.yellow,
      icon: 'signal-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      label: 'Offline',
      value: `${offlineCount} pts`,
      color: offlineCount > 0 ? Colors.amber500 : Colors.green,
      icon: 'navigation-outline' as keyof typeof Ionicons.glyphMap,
    },
  ];

  const syncLabel = syncingNow
    ? 'Sincronizando...'
    : offlineCount > 0
      ? `Sincronizar ${offlineCount} puntos pendientes`
      : 'Todo sincronizado ✓';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View>
        <Text style={styles.sectionTitle}>MONITOREO DE RUTA</Text>
        <Text style={styles.sectionSubtitle}>Telemetría GPS en vivo</Text>
      </View>

      {/* Map Preview Card */}
      <View style={styles.mapPreview}>
        <View style={styles.mapGradient} />

        {/* Grid overlay lines (decorative) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
          }}
        >
          {/* Horizontal grid lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <View
              key={`h-${i}`}
              style={{
                position: 'absolute',
                top: i * 40,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: Colors.yellow,
              }}
            />
          ))}
          {/* Vertical grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={`v-${i}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: i * 40,
                width: 1,
                backgroundColor: Colors.yellow,
              }}
            />
          ))}
        </View>

        {/* Scan line */}
        <ScanLine />

        {/* Glow pulse */}
        <GlowPulse />

        {/* Center MapPin */}
        <View style={styles.mapCenterPin}>
          <Ionicons name="location" size={24} color={Colors.yellow} />
        </View>

        {/* Bottom status strip */}
        <View style={styles.mapStatusStrip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </View>
          <Text style={styles.batchLabel}>BATCH {batchCount}/10</Text>
        </View>
      </View>

      {/* GPS Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons
              name={stat.icon}
              size={16}
              color={stat.color}
              style={styles.statIcon}
            />
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Sync Button */}
      <Pressable
        onPress={handleSync}
        disabled={offlineCount === 0 || syncingNow}
        style={({ pressed }) => [
          styles.syncButton,
          pressed && offlineCount > 0 ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {},
          (offlineCount === 0 || syncingNow) ? { opacity: 0.4 } : {},
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={16}
          color={Colors.zinc300}
        />
        <Text style={styles.syncButtonText}>{syncLabel}</Text>
      </Pressable>
    </ScrollView>
  );
};

export default RoutesTab;
