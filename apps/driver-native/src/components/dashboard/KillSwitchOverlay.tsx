/**
 * KillSwitchOverlay — Full-screen lockdown overlay when subscription unpaid
 *
 * Native version of the PWA KillSwitchOverlay + LockdownScreen.
 * Blocks entire UI when kill-switch triggered (HTTP 402).
 *
 * Visual design:
 *   - Black background (z-9999 equivalent)
 *   - Red warning icon/text
 *   - WhatsApp support link
 *   - "Your data is safe locally" reassurance
 *   - Phone call to support button
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KillSwitchOverlayProps {
  message: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT_URL = 'https://wa.me/18495043872';
const PHONE_SUPPORT_NUMBER = '+18495043872';
const SUBSCRIPTION_AMOUNT = '6,000';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...GlassmorphismStyles.lockOverlay as any,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.section,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.20)',
    backgroundColor: 'rgba(239,68,68,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 10,
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body,
    color: '#a3a3a3',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 24,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  amountHighlight: {
    color: Colors.white,
    fontWeight: '900',
  },
  messageBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.10)',
    backgroundColor: 'rgba(239,68,68,0.05)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    width: '100%',
    marginBottom: Spacing.xl,
  },
  messageText: {
    ...Typography.body,
    color: Colors.redLight,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionsContainer: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.yellow,
    height: 80,
    borderRadius: 24,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  whatsappButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.5,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    height: 64,
    borderRadius: 16,
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  reassuranceText: {
    ...Typography.caption,
    color: '#52525b',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

// ─── Component ─────────────────────────────────────────────────────────────────

export const KillSwitchOverlay: React.FC<KillSwitchOverlayProps> = ({ message }) => {
  const handleWhatsApp = () => {
    Linking.openURL(
      `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent('Necesito pagar mi suscripción de TAD Driver - RD$6,000')}`
    ).catch(() => {});
  };

  const handlePhoneCall = () => {
    Linking.openURL(`tel:${PHONE_SUPPORT_NUMBER}`).catch(() => {});
  };

  return (
    <View style={styles.overlay}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-alert" size={48} color={Colors.redLight} />
        </View>

        {/* Title */}
        <Text style={styles.title}>SERVICIO BLOQUEADO</Text>

        {/* Description */}
        <Text style={styles.description}>
          Tu cuenta ha sido bloqueada. Regulariza tu pago de{' '}
          <Text style={styles.amountHighlight}>RD$ {SUBSCRIPTION_AMOUNT}</Text>{' '}
          para seguir generando ganancias.
        </Text>

        {/* Message box (if provided by payment store) */}
        {message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* WhatsApp Pay Button */}
          <Pressable
            onPress={handleWhatsApp}
            style={({ pressed }) => [
              styles.whatsappButton,
              pressed ? { backgroundColor: '#e6bf00' } : {},
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.black} />
            <Text style={styles.whatsappButtonText}>Pagar vía WhatsApp</Text>
          </Pressable>

          {/* Phone Call Button */}
          <Pressable
            onPress={handlePhoneCall}
            style={({ pressed }) => [
              styles.phoneButton,
              pressed ? { backgroundColor: 'rgba(255,255,255,0.10)' } : {},
            ]}
          >
            <Ionicons name="call-outline" size={24} color={Colors.white} />
            <Text style={styles.phoneButtonText}>Llamar a Soporte</Text>
          </Pressable>
        </View>

        {/* Reassurance */}
        <Text style={styles.reassuranceText}>
          Tus datos acumulados están a salvo localmente.
        </Text>
      </ScrollView>
    </View>
  );
};

export default KillSwitchOverlay;
