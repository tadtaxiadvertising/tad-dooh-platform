import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_constants.dart';
import '../../models/hub_data.dart';
import '../../screens/login_screen.dart' show apiLogin, apiFetchHub, LoginResult;

/// SharedPreferences keys
const String kPrefToken = 'tad_driver_token';
const String kPrefHub = 'tad_driver_user';
const String kPrefTokenExp = 'tad_driver_token_exp';
const String kPrefPhone = 'tad_driver_phone';

/// API base URL — single source of truth (was duplicated in login_screen.dart).
final String kApiBase = ApiConstants.baseUrl;

/// Returns cached token or null — for authenticated API calls.
Future<String?> getCachedToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(kPrefToken);
}

/// Restores cached DriverHubData for fast initial load (before API fetch).
Future<DriverHubData?> restoreCachedHub() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(kPrefHub);
  if (raw == null) return null;
  try {
    return DriverHubData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  } catch (_) {
    return null;
  }
}

/// Saves auth + cached phone after successful login.
/// Phone cached for silent re-login attempt on 401; password NOT cached (security + stale state prevention).
Future<void> persistLogin(LoginResult result, {String? phone, String? password}) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(kPrefToken, result.accessToken);
  await prefs.setString(kPrefHub, jsonEncode(result.hub.toJson()));
  await prefs.setString(
    kPrefTokenExp,
    DateTime.now().add(const Duration(days: 7)).toIso8601String(),
  );
  // Cache phone ONLY for silent re-login attempt (which will fail gracefully without password)
  if (phone != null) await prefs.setString(kPrefPhone, phone);
  // Password intentionally NOT cached - prevents silent re-login with stale subscription status
}

/// Clears all auth state — call on logout.
Future<void> clearLogin() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(kPrefToken);
  await prefs.remove(kPrefHub);
  await prefs.remove(kPrefTokenExp);
  await prefs.remove(kPrefPhone);
}
