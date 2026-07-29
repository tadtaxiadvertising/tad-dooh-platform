import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/tad_theme.dart';
import 'features/auth/login_screen_v2.dart';
import 'screens/dashboard_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/update_available_screen.dart';
import 'services/app_version_service.dart';
import 'core/di/providers.dart';
import 'models/hub_data.dart';
import 'widgets/kill_switch_overlay.dart';

const kAppVersion = '1.0.0';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://ltdcdhqixvbpdcitthqf.supabase.co',
    publishableKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0ZGNkaHFpeHZicGRjaXR0aHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMTc4MTYsImV4cCI6MjA2NDY5MzgxNn0.ZopN0cOPM1cCqIlx9FiA5Y7A4_NRX',
  );

  runApp(const TadDriverApp());
}

class TadDriverApp extends StatefulWidget {
  const TadDriverApp({super.key});

  @override
  State<TadDriverApp> createState() => _TadDriverAppState();
}

class _TadDriverAppState extends State<TadDriverApp> {
  @override
  void initState() {
    super.initState();
    killSwitchState.addListener(_onKillSwitchChanged);
  }

  @override
  void dispose() {
    killSwitchState.removeListener(_onKillSwitchChanged);
    super.dispose();
  }

  void _onKillSwitchChanged() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TAD Driver',
      debugShowCheckedModeBanner: false,
      theme: tadTheme(),
      builder: (context, child) {
        // El KillSwitchOverlay maneja la pantalla de bloqueo de forma global
        return Stack(
          children: [
            if (child != null) child,
            if (killSwitchState.active) const KillSwitchOverlay(),
          ],
        );
      },
      home: const LoginScreenV2(),
      routes: {
        '/dashboard': (context) {
          final hub = ModalRoute.of(context)?.settings.arguments as DriverHubData?;
          return DashboardScreen(hub: hub);
        },
        '/onboarding': (context) => const OnboardingScreen(),
        '/wallet': (context) => const WalletScreen(),
        '/update': (context) {
          final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
          return UpdateAvailableScreen(
            result: args?['result'] ?? const VersionCheckResult(
              status: VersionStatus.unknown,
              info: null,
              currentVersion: '1.0.0',
            ),
            onLater: args?['onLater'] ?? () => Navigator.pop(context),
          );
        },
      },
    );
  }
}
