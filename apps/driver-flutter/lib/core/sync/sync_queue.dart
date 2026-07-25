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

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lng': lng,
        'speed': speedMps,
        'ts': ts.toUtc().toIso8601String(),
      };
}

/// Cola offline simple en memoria (se persiste en SharedPreferences/Isar en producción).
class OfflineQueue {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  final List<List<GpsPoint>> _gpsQueue = [];

  Future<void> enqueueGpsBatch(List<GpsPoint> batch) async {
    _gpsQueue.add(batch);
  }

  List<List<GpsPoint>> drainAll() {
    final result = List<List<GpsPoint>>.from(_gpsQueue);
    _gpsQueue.clear();
    return result;
  }

  bool get isEmpty => _gpsQueue.isEmpty;
  int get pendingBatches => _gpsQueue.length;
}