import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../network/kill_switch_state.dart';
import '../network/kill_switch_interceptor.dart';
import '../sync/sync_engine.dart';
import '../../models/hub_data.dart';

/// API base — production vs debug (10.0.0.2 = host LAN IP for physical devices).
String get apiBase => kReleaseMode
    ? 'https://tad-api.rewvid.easypanel.host/api/v1'
    : 'http://10.0.0.2:3000/api/v1';

/// ─── KillSwitch state (ChangeNotifier) ──────────────────────────────────────

final killSwitchState = KillSwitchState();

/// ─── Supabase client ─────────────────────────────────────────────────────────

SupabaseClient get supabaseClient => Supabase.instance.client;

/// ─── Dio ─────────────────────────────────────────────────────────────────────

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: apiBase,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(KillSwitchInterceptor(
    onKillSwitch: () => killSwitchState.activate('Suscripción vencida — contacte a TAD'),
    onUnauthorized: () {
      clearAuth();
      killSwitchState.activate('Sesión expirada — inicie sesión nuevamente');
    },
    silentReLogin: silentReLogin,
  ));

  return dio;
}

final dio = createDio();

/// ─── Sync engine ─────────────────────────────────────────────────────────────

HybridSyncEngine createSyncEngine() => HybridSyncEngine(
  dio: dio,
  apiBase: apiBase,
  deviceId: null,
);

/// ─── Auth helpers ───────────────────────────────────────────────────────────

const _kPrefToken = 'tad_driver_token';
const _kPrefPhone = 'tad_driver_phone';
const _kPrefPass = 'tad_driver_pass';

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
    final res = await dio.fetch(RequestOptions(
      path: '/drivers/login',
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
    final res = await dio.fetch(RequestOptions(
      path: '/drivers/me/hub',
      method: 'GET',
    ));
    if (res.statusCode == 200) {
      return DriverHubData.fromJson(res.data as Map<String, dynamic>);
    }
  } catch (_) {}
  return null;
}