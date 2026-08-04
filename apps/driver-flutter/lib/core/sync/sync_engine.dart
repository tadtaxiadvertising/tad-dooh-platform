import 'dart:async';
import 'package:dio/dio.dart';

part 'sync_queue.dart';

/// Telemetría híbrida TAD.
/// - Pasivo (default): acumula coordenadas y hace batch cada 5 min a POST /fleet/track-batch.
/// - Activo (on-demand): responde a TRACK_REQUEST de Supabase Realtime
///   y transmite por broadcast durante 2 min.
///
/// NOTE: Supabase realtime integration (channel.on, broadcast) will be wired
/// once the realtime channel types are confirmed from supabase_flutter 2.15.4.
/// The batch-only mode works immediately.
class _SyncLogger {
  const _SyncLogger();

  static void _log(String message) {
    // ignore: avoid_print
    print(message);
  }

  void call(String message) => _log(message);
}

const _kLog = _SyncLogger();

class HybridSyncEngine {
  HybridSyncEngine({
    required Dio dio,
    String? apiBase,
    String? deviceId,
    String? driverId,
    this.batchInterval = const Duration(minutes: 5),
    this.activeStreamDuration = const Duration(minutes: 2),
  })  : _dio = dio,
        _deviceId = deviceId,
        _driverId = driverId;

  final Dio _dio;
  final String? _deviceId;
  final String? _driverId;
  final Duration batchInterval;
  final Duration activeStreamDuration;

  final List<GpsPoint> _pending = [];
  Timer? _batchTimer;
  Timer? _activeModeTimer;
  bool _activeMode = false;

  bool get isActiveMode => _activeMode;

  void start() {
    _batchTimer?.cancel();
    _batchTimer = Timer.periodic(batchInterval, (_) => flushBatch());
    _startRealtimeListener();
  }

  void stop() {
    _batchTimer?.cancel();
    _activeModeTimer?.cancel();
    _stopRealtimeListener();
  }

  /// Llamado por el plugin de background location con cada nueva coordenada.
  void addPoint(double lat, double lng, double? speedMps, DateTime ts) {
    _pending.add(GpsPoint(lat: lat, lng: lng, speedMps: speedMps, ts: ts));
    if (_pending.length >= 60) flushBatch();
  }

  /// Flush buffered GPS points to the backend immediately.
  /// Called by the batch timer, when 60 points accumulate, or on
  /// manual sync request from the UI.
  Future<void> flushBatch() async {
    if (_pending.isEmpty) return;
    final buffer = List<GpsPoint>.from(_pending);
    _pending.clear();

    final path = '/fleet/track-batch';
    _kLog('[SyncEngine] Flushing ${buffer.length} points to $path');

    try {
      final res = await _dio.post(
        path,
        data: {
          'driverId': _driverId ?? '',
          'deviceId': _deviceId ?? '',
          'points': buffer.map((p) => p.toJson()).toList(),
        },
        options: Options(
          headers: _deviceId != null ? {'X-Device-Id': _deviceId} : null,
        ),
      );
      _kLog('[SyncEngine] Batch sync success: ${res.statusCode}');
    } on DioException catch (e) {
      _kLog('[SyncEngine] DioException: ${e.type} - ${e.message}');
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.response == null) {
        _kLog('[SyncEngine] Connection failed. Enqueueing offline.');
        await OfflineQueue.instance.enqueueGpsBatch(buffer);
      }
    } catch (e) {
      _kLog('[SyncEngine] Unexpected sync error: $e');
    }
  }

  // ── Supabase realtime placeholder ───────────────────────────────────────
  // Will be implemented when supabase_flutter realtime API is confirmed.
  void _startRealtimeListener() {
    // TODO: channel.on(RealtimeListenTypes.broadcast, event: 'TRACK_REQUEST', ...)
  }

  void _stopRealtimeListener() {
    _activeMode = false;
    _activeModeTimer?.cancel();
  }
}
