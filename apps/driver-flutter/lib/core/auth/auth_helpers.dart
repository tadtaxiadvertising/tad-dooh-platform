import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_constants.dart';
import '../../models/hub_data.dart';
import '../../screens/login_screen.dart' show apiLogin, LoginResult;

/// SharedPreferences keys
const String kPrefToken = 'tad_driver_token';
const String kPrefHub = 'tad_driver_user';
const String kPrefTokenExp = 'tad_driver_token_exp';
const String kPrefPhone = 'tad_driver_phone';
const String kPrefPassword = 'tad_driver_pass';

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

/// Clears all auth state — call on logout.
Future<void> clearLogin() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(kPrefToken);
  await prefs.remove(kPrefHub);
  await prefs.remove(kPrefTokenExp);
  await prefs.remove(kPrefPhone);
  await prefs.remove(kPrefPassword);
}

/// Silent re-login using cached phone/password (called on 401).
/// Returns new LoginResult or null if no cached creds.
Future<LoginResult?> silentReLogin() async {
  final prefs = await SharedPreferences.getInstance();
  final phone = prefs.getString(kPrefPhone);
  final password = prefs.getString(kPrefPassword);
  if (phone == null || password == null) return null;
  try {
    final result = await apiLogin(phone, password);
    // Persist new token
    await prefs.setString(kPrefToken, result.accessToken);
    return result;
  } catch (_) {
    return null;
  }
}
