import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../network/kill_switch_state.dart';
import '../network/kill_switch_interceptor.dart';
import '../sync/sync_engine.dart';
import '../../models/hub_data.dart';
import '../network/api_constants.dart';

/// ─── KillSwitch state ────────────────────────────────────────────────────────

final killSwitchProvider = ChangeNotifierProvider((ref) => KillSwitchState());

/// ─── App version (for X-Client-Version header) ────────────────────────────────

final appVersionProvider = FutureProvider<String>((ref) async {
  final packageInfo = await PackageInfo.fromPlatform();
  return '${packageInfo.version}+${packageInfo.buildNumber}';
});

/// ─── Supabase client ─────────────────────────────────────────────────────────

final supabaseClientProvider = Provider((ref) => Supabase.instance.client);

/// ─── Dio ─────────────────────────────────────────────────────────────────────

final dioProvider = Provider((ref) {
  final apiBase = ApiConstants.baseUrl;
  debugPrint('DI: createDio with baseUrl: $apiBase');

  final dio = Dio(BaseOptions(
    baseUrl: apiBase,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  // Add X-Client-Version header for token rotation detection
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      try {
        final version = await ref.read(appVersionProvider.future);
        options.headers['X-Client-Version'] = version;
      } catch (_) {
        // If version fetch fails, continue without header
      }
      return handler.next(options);
    },
  ));

  dio.interceptors.add(KillSwitchInterceptor(
    onKillSwitch: () {
      debugPrint('INTERCEPTOR: KillSwitch (402) activado');
      ref.read(killSwitchProvider).activate('Suscripción vencida — realice el pago para continuar');
    },
    onUnauthorized: () {
      ref.read(authHelpersProvider).clearAuth();
      ref.read(killSwitchProvider).activate('Sesión expirada — inicie sesión nuevamente');
    },
    silentReLogin: ref.read(authHelpersProvider).silentReLogin,
  ));

  return dio;
});

/// ─── Sync engine ─────────────────────────────────────────────────────────────

final syncEngineProvider = Provider((ref) => HybridSyncEngine(
      dio: ref.watch(dioProvider),
      apiBase: ApiConstants.baseUrl,
      deviceId: null,
    ));

/// ─── Auth helpers ───────────────────────────────────────────────────────────

final authHelpersProvider = Provider((ref) => AuthHelpers(ref));

class AuthHelpers {
  AuthHelpers(this.ref);
  final Ref ref;

  static const _kPrefToken = 'tad_driver_token';
  static const _kPrefPhone = 'tad_driver_phone';
  // _kPrefPass REMOVED - password not cached anymore (security + stale state prevention)

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPrefToken);
    await prefs.remove(_kPrefPhone);
  }

  Future<bool> silentReLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final phone = prefs.getString(_kPrefPhone);
    // No password cached - silent re-login not possible without user input
    // This will return false and trigger onUnauthorized -> login screen
    if (phone == null) return false;

    try {
      final dio = ref.read(dioProvider);
      // Can't re-login without password, return false to force manual login
      return false;
    } catch (_) {}
    return false;
  }

}
