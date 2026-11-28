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
  // Serialize SharedPreferences updates so enqueue and ACK cannot overwrite
  // each other's persisted representation on a concurrent reconnect.
  Future<void> _operations = Future<void>.value();

  Future<T> _serialized<T>(Future<T> Function() operation) {
    final next = _operations.then((_) => operation());
    _operations = next.then<void>((_) {}, onError: (Object _, StackTrace __) {});
    return next;
  }

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
    final saved = await prefs.setString(_kPrefKey, encoded);
    if (!saved) throw StateError('GPS offline queue persistence failed');
  }

  Future<void> enqueueGpsBatch(List<GpsPoint> batch) =>
      _serialized(() async {
        await _ensureHydrated();
        if (batch.isEmpty) return;
        _gpsQueue.add(List<GpsPoint>.from(batch));
        try {
          await _persist();
        } catch (_) {
          _gpsQueue.removeLast();
          rethrow;
        }
      });

  /// Read-only. A batch stays on disk while the HTTP request is in flight.
  Future<List<GpsPoint>?> peekFirstBatch() => _serialized(() async {
        await _ensureHydrated();
        if (_gpsQueue.isEmpty) return null;
        return List<GpsPoint>.from(_gpsQueue.first);
      });

  /// Only call on a valid application-level receipt for the first batch.
  Future<void> acknowledgeFirstBatch() => _serialized(() async {
        await _ensureHydrated();
        if (_gpsQueue.isEmpty) return;
        final first = _gpsQueue.removeAt(0);
        try {
          await _persist();
        } catch (_) {
          _gpsQueue.insert(0, first);
          rethrow;
        }
      });

  Future<bool> get isEmpty => _serialized(() async {
        await _ensureHydrated();
        return _gpsQueue.isEmpty;
      });

  Future<int> get pendingBatches => _serialized(() async {
        await _ensureHydrated();
        return _gpsQueue.length;
      });

}