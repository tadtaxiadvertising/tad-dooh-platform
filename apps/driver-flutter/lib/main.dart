import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'theme/tad_theme.dart';
import 'features/auth/login_screen_v2.dart';
import 'screens/dashboard_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/update_available_screen.dart';
import 'services/app_version_service.dart';
import 'services/notification_service.dart';
import 'services/background_service.dart';
import 'core/di/providers.dart';
import 'models/hub_data.dart';
import 'widgets/kill_switch_overlay.dart';

const kAppVersion = '1.0.0';

Future<void> main() async {
  // Crucial: bind before any async init that touches platform channels.
  WidgetsFlutterBinding.ensureInitialized();

  debugPrint('[DEBUG] === START main() ===');

  // Make any uncaught framework build error visible (no more silent white screen).
  FlutterError.onError = (details) {
    debugPrint('[FLUTTER ERROR] ${details.exceptionAsString()}\n${details.stack}');
  };
  ErrorWidget.builder = (details) {
    debugPrint('[ERROR WIDGET] ${details.exceptionAsString()}');
    return Material(
      color: const Color(0xFF0E0E0E),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Color(0xFFF5B800), size: 48),
            const SizedBox(height: 16),
            Text(
              'Error de renderizado',
              style: TextStyle(
                color: const Color(0xFFFAD400),
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              details.exceptionAsString(),
              style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 13),
              textAlign: TextAlign.center,
              maxLines: 20,
              overflow: TextOverflow.fade,
            ),
          ],
        ),
      ),
    );
  };

  // Load environment variables
  try {
    debugPrint('[DEBUG] Loading dotenv...');
    await dotenv.load(fileName: ".env");
    debugPrint('[DEBUG] dotenv loaded. SUPABASE_URL=${dotenv.env['SUPABASE_URL']}');
  } catch (e) {
    debugPrint('[main] dotenv load failed: $e');
  }

  // Initialize Supabase for auth/realtime/auth state changes
  try {
    debugPrint('[DEBUG] Initializing Supabase...');
    await Supabase.initialize(
      url: dotenv.env['SUPABASE_URL'] ?? '',
      anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
    );
    debugPrint('[DEBUG] Supabase initialized OK');
  } catch (e) {
    debugPrint('[main] Supabase initialize failed: $e');
  }

  // Initialize local notifications (non-blocking; deferred permission request)
  try {
    debugPrint('[DEBUG] Initializing NotificationService...');
    await NotificationService.I.init();
    debugPrint('[DEBUG] NotificationService initialized OK');
  } catch (e) {
    debugPrint('[main] NotificationService init failed: $e');
  }

  debugPrint('[DEBUG] Calling runApp...');
  runApp(
    const ProviderScope(
      child: TadDriverApp(),
    ),
  );
  debugPrint('[DEBUG] === runApp returned (frame scheduled) ===');
}

class TadDriverApp extends ConsumerWidget {
  const TadDriverApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final killSwitch = ref.watch(killSwitchProvider);

    return MaterialApp(
      title: 'TAD Driver',
      debugShowCheckedModeBanner: false,
      theme: tadTheme(),
      builder: (context, child) {
        return Stack(
          children: [
            if (child != null) child,
            if (killSwitch.active) const KillSwitchOverlay(),
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
            result: args?['result'] as VersionCheckResult? ?? const VersionCheckResult(
              status: VersionStatus.unknown,
              info: null,
              currentVersion: '1.0.0',
            ),
            onLater: args?['onLater'] as VoidCallback? ?? () => Navigator.pop(context),
          );
        },
      },
    );
  }
}
