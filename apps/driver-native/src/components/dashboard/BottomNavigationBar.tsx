/**
 * BottomNavigationBar — Barra de navegación inferior premium
 *
 * React Native version of the PWA BottomNavigationBar.
 * 4 tabs: Inicio, Rutas, Billetera, Ajustes.
 * Glassmorphism styling with gold border-top, active tab yellow glow.
 *
 * Uses NativeWind className + StyleSheet for glassmorphism effects
 * that NativeWind can't handle (shadow, elevation, specific rgba colors).
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, GlassmorphismStyles, Typography, Spacing } from '../../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabId = 'home' | 'routes' | 'wallet' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Inicio',     icon: 'home' },
  { id: 'routes',   label: 'Rutas',      icon: 'location' },
  { id: 'wallet',   label: 'Billetera',  icon: 'wallet' },
  { id: 'settings', label: 'Ajustes',    icon: 'settings' },
];

interface BottomNavigationBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  navBar: {
    ...GlassmorphismStyles.bottomNav as any,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    paddingHorizontal: 12,
  },
  tabButton: {
    width: 64,
    height: 56,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabButtonActive: {
    ...GlassmorphismStyles.activeTab as any,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 56,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...Typography.caption,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  tabLabelActive: {
    ...Typography.caption,
    letterSpacing: 1.2,
    marginTop: 4,
    color: Colors.yellow,
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.yellow,
    shadowColor: Colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientFade: {
    height: 32,
    backgroundColor: Colors.primary,
  },
});

// ─── Component ─────────────────────────────────────────────────────────────────

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [pressedTab, setPressedTab] = useState<TabId | null>(null);

  return (
    <>
      {/* Gradient fade above nav */}
      <View style={styles.gradientFade} />

      {/* Navigation bar */}
      <View style={styles.navBar}>
        <View style={styles.navContent}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isPressed = pressedTab === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => onTabChange(item.id)}
                onPressIn={() => setPressedTab(item.id)}
                onPressOut={() => setPressedTab(null)}
                style={({ pressed }) => [
                  isActive ? styles.tabButtonActive : styles.tabButton,
                  pressed && !isActive ? { opacity: 0.7 } : {},
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={item.label}
              >
                {/* Active dot indicator at top */}
                {isActive && <View style={styles.activeDot} />}

                {/* Icon */}
                <View style={styles.tabIconContainer}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? Colors.yellow : '#52525b'}
                    style={
                      isActive
                        ? {
                            shadowColor: Colors.yellow,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.4,
                            shadowRadius: 8,
                            elevation: 4,
                          }
                        : undefined
                    }
                  />
                </View>

                {/* Label */}
                <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
};

export default BottomNavigationBar;
