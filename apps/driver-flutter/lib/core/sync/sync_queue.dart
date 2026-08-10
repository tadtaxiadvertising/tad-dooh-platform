part of 'sync_engine.dart';

/// Punto GPS guardado en la cola offline.
class GpsPoint {
  GpsPoint({
    required this.lat,
    required this.lng,
    this.speedMps,
    required this.ts,
  });

  final double lat;
  final double lng;
  final double? speedMps;
  final DateTime ts;

  factory GpsPoint.fromJson(Map<String, dynamic> json) => GpsPoint(
        lat: (json['lat'] as num).toDouble(),
        lng: (json['lng'] as num).toDouble(),
        speedMps: (json['speed'] as num?)?.toDouble(),
        ts: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
      );

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'speed': speedMps ?? 0.0,
        'timestamp': ts.millisecondsSinceEpoch,
      };
}

/// Cola offline simple en memoria (se persiste en SharedPreferences/Isar en producción).
class OfflineQueue {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  final List<List<GpsPoint>> _gpsQueue = [];
  static const _storageKey = 'tad_driver_gps_queue';
  Future<void>? _loadFuture;

  Future<void> _ensureLoaded() {
    return _loadFuture ??= SharedPreferences.getInstance().then((prefs) {
      final raw = prefs.getString(_storageKey);
      if (raw == null) return;
      final stored = jsonDecode(raw) as List<dynamic>;
      _gpsQueue
        ..clear()
        ..addAll(stored.map((batch) => (batch as List<dynamic>)
            .map((point) => GpsPoint.fromJson(point as Map<String, dynamic>))
            .toList()));
    });
  }

  Future<void> enqueueGpsBatch(List<GpsPoint> batch) async {
    await _ensureLoaded();
    _gpsQueue.add(batch);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _storageKey,
      jsonEncode(_gpsQueue.map((item) => item.map((p) => p.toJson()).toList()).toList()),
    );
  }

  Future<List<List<GpsPoint>>> drainAll() async {
    await _ensureLoaded();
    final prefs = await SharedPreferences.getInstance();
    final result = List<List<GpsPoint>>.from(_gpsQueue);
    _gpsQueue.clear();
    await prefs.remove(_storageKey);
    return result;
  }

  bool get isEmpty => _gpsQueue.isEmpty;
  int get pendingBatches => _gpsQueue.length;
}