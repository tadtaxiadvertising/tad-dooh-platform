import 'package:dio/dio.dart';
import '../models/hub_data.dart';
import '../screens/login_screen.dart' show getCachedToken, silentReLogin, kApiBase;

/// Fetches driver hub data from backend via Dio (goes through KillSwitchInterceptor).
/// GET /api/v1/drivers/me/hub — requires JWT Bearer token.
///
/// On 401, attempts silent re-login with cached creds, then retries once.
/// Returns null if no session or both attempts fail.
Future<DriverHubData?> fetchHub() async {
  final token = await getCachedToken();
  if (token == null) return null;

  final hub = await _doFetch(token);
  if (hub != null) return hub;

  // 401 — try silent re-login, then retry
  final newLogin = await silentReLogin();
  if (newLogin == null) return null;

  return _doFetch(newLogin.accessToken);
}

Future<DriverHubData?> _doFetch(String token) async {
  try {
    final res = await Dio().get(
      '$kApiBase/drivers/me/hub',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    if (res.statusCode == 200) {
      return DriverHubData.fromJson(res.data as Map<String, dynamic>);
    }
    return null;
  } catch (_) {
    return null;
  }
}