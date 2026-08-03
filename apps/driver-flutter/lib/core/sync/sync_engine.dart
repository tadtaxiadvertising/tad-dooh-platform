import 'dart:async';
import 'package:dio/dio.dart';

part 'sync_queue.dart';

/// Telemetría híbrida TAD.
/// - Pasivo (default): acumula coordenadas y hace batch cada 5 min a POST /fleet/track-batch.
/// - Activo (on-demand): responde a TRACK_REQUEST de Supabase Realtime
/// y transmite por broadcast durante 2 min.
///
/// NOTE: Supabase realtime integration (channel.on, broadcast) will be wired
/// once the realtime channel types are confirmed from supabase_flutter 2.15.4.
/// The batch-only mode works immediately.
class HybridSyncEngine {
  HybridSyncEngine({
    required Dio dio,
    String? apiBase,
    String? deviceId,
    String? driverId,
    this.batchInterval = const Duration(minutes: 5),
    this.activeStreamDuration = const Duration(minutes: 2),
  }) : _dio = dio,
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
    _batchTimer = Timer.periodic(batchInterval, (_) => _flushBatch());
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
    try {
      await _dio.post(
        '/fleet/track-batch',
        data: {
          'driverId': _driverId ?? '',
          'deviceId': _deviceId ?? '',
          'points': buffer.map((p) => p.toJson()).toList(),
        },
        options: Options(
          headers: _deviceId != null ? {'X-Device-Id': _deviceId} : null,
        ),
      );
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        await OfflineQueue.instance.enqueueGpsBatch(buffer);
      }
    } catch (_) {}
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
