import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  static String get baseUrl {
    final prodUrl = dotenv.env['API_BASE_URL_PROD'];
    final devUrl = dotenv.env['API_BASE_URL_DEV'];

    String url;
    if (kReleaseMode) {
      url = prodUrl ?? 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1/';
    } else {
      // Priorizar .env, luego 10.0.2.2 (emulador), luego localhost
      url = devUrl ?? 'http://10.0.2.2:3000/api/v1/';
    }
    
    // Asegurar que termine en /
    if (!url.endsWith('/')) {
      url = '$url/';
    }
    
    debugPrint('[ApiConstants] Using baseUrl: $url');
    return url;
  }

  // Rutas relativas (sin '/' inicial)
  static const String loginPath = 'drivers/login';
  static const String hubPath = 'drivers/me/hub';
  static const String versionPath = 'drivers/app-version';
}
