/**
 * usePerformanceFallback.ts — Low-End Tablet Detection for Native App
 *
 * Replaces the PWA's navigator.hardwareConcurrency / deviceMemory check
 * with expo-device capabilities. Detects low-end Android tablets and
 * disables glassmorphism effects (backdrop-blur, heavy shadows, shimmer)
 * to prevent JS thread jank on ≤4 core devices.
 */

import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import { InteractionManager } from 'react-native';

interface PerformanceFallbackResult {
  isLowPerformance: boolean;
  disableGlassmorphism: boolean;
  disableAnimations: boolean;
  simpleBorders: boolean;
}

export function usePerformanceFallback(): PerformanceFallbackResult {
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      // Check 1: CPU cores (expo-device doesn't expose core count directly,
      // but totalMemory is a reliable proxy for low-end devices)
      const lowMemory = Device.totalMemory <= 4 * 1024 * 1024 * 1024; // ≤4GB RAM

      // Check 2: Device model year (old devices have slower JS engines)
      const isOldDevice = Device.osBuildId?.startsWith('R') ||
        Device.modelName?.includes('Tab A') ||
        Device.modelName?.includes('Tab E') ||
        Device.modelName?.includes('Galaxy J');

      // Check 3: Platform capability
      const isLowEndPlatform = Device.deviceType === Device.DeviceType.PHONE &&
        Device.totalMemory < 2 * 1024 * 1024 * 1024;

      setIsLowPerformance(lowMemory || Boolean(isOldDevice) || isLowEndPlatform);
    });
  }, []);

  return {
    isLowPerformance,
    disableGlassmorphism: isLowPerformance,
    disableAnimations: isLowPerformance,
    simpleBorders: isLowPerformance,
  };
}
