class ApiConstants {
  static String get baseUrl {
    // IMPORTANTE: El trailing slash '/' es vital para que Dio concatene rutas relativas correctamente.
    return 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api/v1/';
  }

  // Rutas relativas (sin '/' inicial)
  static const String loginPath = 'drivers/login';
  static const String hubPath = 'drivers/me/hub';
  static const String versionPath = 'drivers/app-version';
}
