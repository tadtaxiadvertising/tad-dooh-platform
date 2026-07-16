/**
 * SettingsTab — Vista de Ajustes y Soporte
 *
 * Acciones tácticas del conductor:
 *   - Connectivity status card
 *   - Soporte WhatsApp, Reportar falla, Sincronizar datos
 *   - Referir conductor, Cerrar sesión
 *   - Version info footer
 *
 * Layout tipo "settings list" optimizado para móvil (hitboxes 48px+).
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'online' | 'offline' | 'syncing';

interface SettingsTabProps {
  driverName: string;
  onLogout: () => void;
  onSync: () => void;
  connectionStatus: ConnectionStatus;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT_URL = 'https://wa.me/18495043872';
const PHONE_SUPPORT_NUMBER = '+18495043872';

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
  connectivityCard: {
    ...GlassmorphismStyles.stitchedCard as any,
    borderRadius: 32,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  connectivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  connectivityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  connectivityIconBoxOnline: {
    borderColor: 'rgba(34,197,94,0.20)',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  connectivityIconBoxOffline: {
    borderColor: 'rgba(239,68,68,0.20)',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  connectivityLabel: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '900',
  },
  connectivitySublabel: {
    ...Typography.caption,
    color: '#52525b',
    letterSpacing: 1,
    fontSize: 10,
    marginTop: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  settingsItemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemLabel: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '900',
    fontSize: 14,
  },
  settingsItemSublabel: {
    ...Typography.caption,
    color: '#52525b',
    letterSpacing: 1,
    fontSize: 10,
    marginTop: 2,
  },
  settingsItemChevron: {
    marginLeft: 'auto',
  },
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    backgroundColor: 'rgba(255,255,255,0.01)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  versionText: {
    ...Typography.caption,
    color: '#3f3f46',
    letterSpacing: 1.5,
    fontSize: 10,
  },
  versionDebug: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#27272a',
  },
});

// ─── SettingsItem Component ────────────────────────────────────────────────────

interface SettingsItemDef {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
}

function SettingsItemRow({ icon, iconColor, label, sublabel, onPress, disabled }: SettingsItemDef) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.settingsItem,
        pressed ? { backgroundColor: 'rgba(255,255,255,0.06)' } : {},
        disabled ? { opacity: 0.4 } : {},
      ]}
    >
      <View style={styles.settingsItemIconBox}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingsItemLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingsItemSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons
        name="chevron-forward-outline"
        size={16}
        color="#3f3f46"
        style={styles.settingsItemChevron}
      />
    </Pressable>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const SettingsTab: React.FC<SettingsTabProps> = ({
  driverName,
  onLogout,
  onSync,
  connectionStatus,
}) => {
  const [syncingNow, setSyncingNow] = useState(false);
  const isOffline = connectionStatus === 'offline';

  const handleSync = async () => {
    setSyncingNow(true);
    try {
      await onSync();
    } finally {
      setSyncingNow(false);
    }
  };

  const handleWhatsAppSupport = () => {
    Linking.openURL(WHATSAPP_SUPPORT_URL).catch(() => {
      // Fallback: try phone call
      Linking.openURL(`tel:${PHONE_SUPPORT_NUMBER}`);
    });
  };

  const handleReportFalla = () => {
    Linking.openURL(
      `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent('Reportando falla desde app TAD Driver')}`
    ).catch(() => {});
  };

  const handleReferir = () => {
    Linking.openURL(
      `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent('Quiero referir un conductor a TAD')}`
    ).catch(() => {});
  };

  const settingsItems: SettingsItemDef[] = [
    {
      icon: 'chatbubble-ellipses-outline',
      iconColor: Colors.green,
      label: 'Soporte por WhatsApp',
      sublabel: 'Respuesta rápida en minutos',
      onPress: handleWhatsAppSupport,
    },
    {
      icon: 'alert-circle-outline',
      iconColor: Colors.red,
      label: 'Reportar falla',
      sublabel: 'Dispositivo, app o telemetría',
      onPress: handleReportFalla,
    },
    {
      icon: 'refresh-outline',
      iconColor: Colors.yellow,
      label: 'Sincronizar datos',
      sublabel: syncingNow ? 'Sincronizando...' : 'Todo al día',
      onPress: handleSync,
      disabled: syncingNow,
    },
    {
      icon: 'person-add-outline',
      iconColor: '#3b82f6',
      label: 'Referir conductor',
      sublabel: 'Gana bonos por cada referido activo',
      onPress: handleReferir,
    },
    {
      icon: 'log-out-outline',
      iconColor: Colors.zinc500,
      label: 'Cerrar sesión',
      sublabel: 'Desconectar de la plataforma',
      onPress: onLogout,
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View>
        <Text style={styles.sectionTitle}>AJUSTES</Text>
        <Text style={styles.sectionSubtitle}>Soporte y configuración</Text>
      </View>

      {/* Connectivity Status Card */}
      <View style={styles.connectivityCard}>
        <View style={styles.connectivityRow}>
          <View
            style={[
              styles.connectivityIconBox,
              isOffline ? styles.connectivityIconBoxOffline : styles.connectivityIconBoxOnline,
            ]}
          >
            <Ionicons
              name="wifi-outline"
              size={20}
              color={isOffline ? Colors.red : Colors.green}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.connectivityLabel}>
              {isOffline ? 'Sin conexión' : 'Conectado'}
            </Text>
            <Text style={styles.connectivitySublabel}>
              GPS {connectionStatus === 'online' ? 'activo' : 'detenido'}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings Items */}
      <View style={{ gap: Spacing.sm }}>
        {settingsItems.map((item, i) => (
          <SettingsItemRow key={i} {...item} />
        ))}
      </View>

      {/* Version Info */}
      <View style={styles.versionCard}>
        <Ionicons name="information-circle-outline" size={16} color="#3f3f46" />
        <View style={{ flex: 1 }}>
          <Text style={styles.versionText}>
            TAD Driver Portal v12.0.0
          </Text>
          <Text style={styles.versionDebug}>
            Red: {connectionStatus.toUpperCase()} · Build: dev
          </Text>
        </View>
        <Ionicons name="phone-portrait-outline" size={16} color="#27272a" />
      </View>
    </ScrollView>
  );
};

export default SettingsTab;
