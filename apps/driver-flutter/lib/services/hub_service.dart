import 'dart:convert';
import 'dart:io';
import '../models/hub_data.dart';
import '../screens/login_screen.dart' show getCachedToken, silentReLogin, kApiBase;

/// Fetches driver hub data from backend.
/// GET /api/drivers/me/hub — requires JWT Bearer token.
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
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 10);

    final req = await client.getUrl(Uri.parse('$kApiBase/drivers/me/hub'));
    req.headers.contentType = ContentType.json;
    req.headers.set('Authorization', 'Bearer $token');

    final res = await req.close();
    final body = await res.transform(utf8.decoder).join();
    client.close();

    if (res.statusCode == 200) {
      return DriverHubData.fromJson(jsonDecode(body) as Map<String, dynamic>);
    }
    return null;
  } catch (_) {
    return null;
  }
}
