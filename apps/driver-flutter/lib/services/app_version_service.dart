import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

/// Respuesta del endpoint GET /api/drivers/app-version.
@immutable
class AppVersionInfo {
  const AppVersionInfo({
    required this.latestVersion,
    required this.minVersion,
    required this.forceUpdate,
    required this.downloadUrl,
    required this.releaseNotes,
  });

  final String latestVersion;
  final String minVersion;
  final bool forceUpdate;
  final String downloadUrl;
  final String releaseNotes;

  factory AppVersionInfo.fromJson(Map<String, dynamic> json) => AppVersionInfo(
    latestVersion: (json['latestVersion'] ?? '1.0.0').toString(),
    minVersion: (json['minVersion'] ?? '1.0.0').toString(),
    forceUpdate: json['forceUpdate'] == true,
    downloadUrl: (json['downloadUrl'] ?? '').toString(),
    releaseNotes: (json['releaseNotes'] ?? '').toString(),
  );
}

/// Resultado de la verificación de versión.
enum VersionStatus { upgraded, optional, required, unknown }

@immutable
class VersionCheckResult {
  const VersionCheckResult({
    required this.status,
    required this.info,
    required this.currentVersion,
  });

  final VersionStatus status;
  final AppVersionInfo? info;
  final String currentVersion;
}

/// Servicio que consulta el backend para chequear la versión publicada
/// de la app Flutter y decidir si se debe forzar actualización.
class AppVersionService {
  AppVersionService({String? apiBase})
    : apiBase = apiBase ??
          (kReleaseMode
              ? 'https://tad-api.rewvid.easypanel.host/api/v1'
              : 'http://10.0.2.2:3000/api/v1');

  final String apiBase;
  static const Duration timeout = Duration(seconds: 8);

  /// Compara dos versiones semver (string). Devuelve:
  ///  >0 si current > other, 0 si iguales, <0 si current < other.
  /// Compara sólo los segmentos numéricos principales (mayor.menor.patch).
  int compareVersions(String current, String other) {
    final cur = _parseSemver(current);
    final oth = _parseSemver(other);
    for (var i = 0; i < 3; i++) {
      final diff = cur[i].compareTo(oth[i]);
      if (diff != 0) return diff;
    }
    return 0;
  }

  List<int> _parseSemver(String v) {
    final clean = v.split(RegExp(r'[^0-9]'))..retainWhere((s) => s.isNotEmpty);
    return [for (var i = 0; i < 3; i++) int.tryParse(clean[i]) ?? 0];
  }

  /// Verifica la versión local contra el backend.
  /// Devuelve [VersionStatus] para que el widget decida la UI.
  Future<VersionCheckResult> checkVersion({required String currentVersion}) async {
    try {
      final client = HttpClient();
      client.connectionTimeout = timeout;
      final req = await client.getUrl(Uri.parse('$apiBase/drivers/app-version'));
      final res = await req.close();
      if (res.statusCode != 200) {
        return VersionCheckResult(
          status: VersionStatus.unknown,
          info: null,
          currentVersion: currentVersion,
        );
      }
      final body = await res.transform(utf8.decoder).join();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final info = AppVersionInfo.fromJson(json);
      client.close();

      if (forceUpdateFlag(info, currentVersion)) {
        return VersionCheckResult(
          status: VersionStatus.required,
          info: info,
          currentVersion: currentVersion,
        );
      }
      if (compareVersions(currentVersion, info.latestVersion) < 0) {
        return VersionCheckResult(
          status: VersionStatus.optional,
          info: info,
          currentVersion: currentVersion,
        );
      }
      return VersionCheckResult(
        status: VersionStatus.upgraded,
        info: info,
        currentVersion: currentVersion,
      );
    } catch (_) {
      return VersionCheckResult(
        status: VersionStatus.unknown,
        info: null,
        currentVersion: currentVersion,
      );
    }
  }

  /// true si el backend marca forceUpdate=true o si current < minVersion.
  bool forceUpdateFlag(AppVersionInfo info, String currentVersion) {
    if (info.forceUpdate) return true;
    return compareVersions(currentVersion, info.minVersion) < 0;
  }
}
