import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../core/di/providers.dart';
import '../core/network/api_constants.dart';

// Generador de provider para el servicio
final appVersionServiceProvider = Provider((ref) {
  return AppVersionService(dio: ref.watch(dioProvider));
});

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
  AppVersionService({required this.dio});

  final Dio dio;

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
    final clean = v.split(RegExp(r'[^0-9]'))
      ..removeWhere((s) => s.isEmpty);
    final segments = [for (var i = 0; i < clean.length; i++) int.tryParse(clean[i]) ?? 0];
    // Asegurar al menos 3 segmentos (mayor.menor.patch)
    while (segments.length < 3) {
      segments.add(0);
    }
    return segments.sublist(0, 3);
  }

  /// Verifica la versión local contra el backend.
  /// Devuelve [VersionStatus] para que el widget decida la UI.
  Future<VersionCheckResult> checkVersion({required String currentVersion}) async {
    try {
      final res = await dio.get(ApiConstants.versionPath);

      if (res.statusCode != 200) {
        return VersionCheckResult(
          status: VersionStatus.unknown,
          info: null,
          currentVersion: currentVersion,
        );
      }

      final info = AppVersionInfo.fromJson(res.data as Map<String, dynamic>);

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
