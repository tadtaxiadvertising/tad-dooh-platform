import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../network/kill_switch_state.dart';
import '../network/kill_switch_interceptor.dart';
import '../sync/sync_engine.dart';
import '../../models/hub_data.dart';
import '../network/api_constants.dart';

/// ─── KillSwitch state ────────────────────────────────────────────────────────

final killSwitchProvider = ChangeNotifierProvider((ref) => KillSwitchState());

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

  dio.interceptors.add(KillSwitchInterceptor(
    onKillSwitch: () {
      debugPrint('INTERCEPTOR: KillSwitch (402) suppressed for development');
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
  static const _kPrefPass = 'tad_driver_pass';

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPrefToken);
    await prefs.remove(_kPrefPhone);
    await prefs.remove(_kPrefPass);
  }

  Future<bool> silentReLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final phone = prefs.getString(_kPrefPhone);
    final password = prefs.getString(_kPrefPass);
    if (phone == null || password == null) return false;

    try {
      final dio = ref.read(dioProvider);
      final res = await dio.fetch(RequestOptions(
        path: ApiConstants.loginPath,
        method: 'POST',
        data: {'phone': phone, 'password': password},
      ));
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = res.data as Map<String, dynamic>;
        await prefs.setString(_kPrefToken, data['access_token']?.toString() ?? '');
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<DriverHubData?> fetchHub() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kPrefToken);
    if (token == null) return null;

    try {
      final dio = ref.read(dioProvider);
      final res = await dio.fetch(RequestOptions(
        path: ApiConstants.hubPath,
        method: 'GET',
      ));
      if (res.statusCode == 200) {
        return DriverHubData.fromJson(res.data as Map<String, dynamic>);
      }
    } catch (_) {}
    return null;
  }
}
