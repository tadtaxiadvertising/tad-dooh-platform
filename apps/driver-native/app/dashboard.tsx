import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useBackgroundTelemetry } from '../src/hooks/useBackgroundTelemetry';
import { useDriverHub } from '../src/hooks/useDriverHub';
import { usePaymentStore } from '../src/store/usePaymentStore';
import { useAuthStore } from '../src/store/useAuthStore';
import { KillSwitchOverlay } from '../src/components/dashboard/KillSwitchOverlay';
import { BottomNavigationBar } from '../src/components/dashboard/BottomNavigationBar';
import { HomeTab } from '../src/components/dashboard/HomeTab';
import { RoutesTab } from '../src/components/dashboard/RoutesTab';
import { WalletTab } from '../src/components/dashboard/WalletTab';
import { SettingsTab } from '../src/components/dashboard/SettingsTab';
import { Colors } from '../src/styles/theme';

type TabId = 'home' | 'routes' | 'wallet' | 'settings';

export default function DriverDashboard() {
  const router = useRouter();
  const telemetry = useBackgroundTelemetry();
  const { data: hubData, loading: hubLoading, isLocalMode } = useDriverHub();
  const { isLocked, message: lockMessage } = usePaymentStore();
  const { driverId, driverName, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('home');

  // Auto-start GPS tracking on dashboard mount
  useEffect(() => {
    void telemetry.startTracking();
  }, []);

  // Kill-switch: redirect to login if force logout detected
  useEffect(() => {
    if ((globalThis as any).__TAD_FORCE_LOGOUT) {
      logout();
      router.replace('/login');
    }
  }, [isLocked]);

  // Lock overlay blocks entire UI
  if (isLocked) {
    return <KillSwitchOverlay message={lockMessage} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            hubData={hubData}
            hubLoading={hubLoading}
            isLocalMode={isLocalMode}
            telemetry={telemetry}
            driverName={driverName || 'Conductor'}
          />
        );
      case 'routes':
        return <RoutesTab telemetry={telemetry} />;
      case 'wallet':
        return (
          <WalletTab
            hubData={hubData}
            hubLoading={hubLoading}
            isLocalMode={isLocalMode}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            driverName={driverName || 'Conductor'}
            onLogout={() => {
              void telemetry.stopTracking();
              logout();
              router.replace('/login');
            }}
            onSync={() => void telemetry.syncPending()}
            connectionStatus={telemetry.connectionStatus}
          />
        );
    }
  };

  return (
    <View className="flex-1 bg-tad-dark">
      {/* Status bar */}
      <View className="pt-12 pb-4 px-6 bg-black/40">
        <View className="flex-row items-center justify-between">
          <Text className="text-white font-bold text-lg">TAD Driver</Text>
          <View className="flex-row items-center gap-2">
            <View
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  telemetry.connectionStatus === 'online' ? Colors.green :
                  telemetry.connectionStatus === 'syncing' ? Colors.yellowAccent :
                  Colors.red,
              }}
            />
            <Text className="text-zinc-400 text-xs">
              {telemetry.connectionStatus === 'online' ? 'Online' :
               telemetry.connectionStatus === 'syncing' ? 'Syncing...' :
               'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab content */}
      <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
        {renderTab()}
      </ScrollView>

      {/* Bottom navigation */}
      <BottomNavigationBar activeTab={activeTab} onTabChange={setActiveTab} />
    </View>
  );
}
