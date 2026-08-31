part of 'sync_engine.dart';

/// Punto GPS guardado en la cola offline.
class GpsPoint {
  GpsPoint({
    required this.lat,
    required this.lng,
    this.speedMps,
    required this.ts,
  });

  factory GpsPoint.fromJson(Map<String, dynamic> json) => GpsPoint(
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        speedMps: (json['speed'] as num?)?.toDouble(),
        ts: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
      );

  final double lat;
  final double lng;
  final double? speedMps;
  final DateTime ts;

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'speed': speedMps ?? 0.0,
        'timestamp': ts.millisecondsSinceEpoch,
      };
}

/// Cola offline persistida en SharedPreferences (M5): si el proceso es
/// matado (kill por el OS, pérdida de la app), los batches GPS pendientes
/// sobreviven y se reenvían al reconectar con POST /fleet/track-batch.
class OfflineQueue {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  static const _kPrefKey = 'tad_driver_offline_gps_queue';

  final List<List<GpsPoint>> _gpsQueue = [];
  bool _hydrated = false;

  Future<void> _ensureHydrated() async {
    if (_hydrated) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kPrefKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = (jsonDecode(raw) as List<dynamic>);
        for (final batch in decoded) {
          _gpsQueue.add(
            (batch as List<dynamic>)
                .map((p) => GpsPoint.fromJson(p as Map<String, dynamic>))
                .toList(),
          );
        }
      } catch (_) {
        await prefs.remove(_kPrefKey);
      }
    }
    _hydrated = true;
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
      _gpsQueue
          .map((b) => b.map((p) => p.toJson()).toList())
          .toList(),
    );
    await prefs.setString(_kPrefKey, encoded);
  }

  Future<void> enqueueGpsBatch(List<GpsPoint> batch) async {
    await _ensureHydrated();
    _gpsQueue.add(batch);
    await _persist();
  }

  Future<List<List<GpsPoint>>> drainAll() async {
    await _ensureHydrated();
    final result = List<List<GpsPoint>>.from(_gpsQueue);
    _gpsQueue.clear();
    await _persist();
    return result;
  }

  Future<bool> get isEmpty async {
    await _ensureHydrated();
    return _gpsQueue.isEmpty;
  }

  Future<int> get pendingBatches async {
    await _ensureHydrated();
    return _gpsQueue.length;
  }
}