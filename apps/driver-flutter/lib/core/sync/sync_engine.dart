import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  String? _deviceId;
  String? _driverId;
  final Duration batchInterval;
  final Duration activeStreamDuration;

  final List<GpsPoint> _pending = [];
  Timer? _batchTimer;
  Timer? _activeModeTimer;
  bool _activeMode = false;

  bool get isActiveMode => _activeMode;

  /// Set the identity returned by the authenticated hub response.
  /// The provider is created before login, so identity cannot be constructor-only.
  void setIdentity({required String driverId, String? deviceId}) {
    _driverId = driverId;
    _deviceId = deviceId;
  }

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
    final queued = await OfflineQueue.instance.drainAll();
    if (_pending.isEmpty && queued.isEmpty) return;
    final buffer = List<GpsPoint>.from(_pending);
    _pending.clear();
    final batches = <List<GpsPoint>>[...queued, if (buffer.isNotEmpty) buffer];
    final points = batches.expand<GpsPoint>((batch) => batch).toList();

    final path = '/fleet/track-batch';
    _kLog('[SyncEngine] Flushing ${points.length} points to $path');

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('tad_driver_token');
      final deviceId = prefs.getString('tad_driver_device_id') ?? _deviceId;
      final res = await _dio.post(
        path,
        data: {
          'driverId': _driverId ?? '',
          'deviceId': _deviceId ?? '',
          'points': points.map((p) => p.toJson()).toList(),
        },
        options: Options(
          headers: {
            if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
            if (deviceId != null) 'X-Device-Id': deviceId,
            'Idempotency-Key': 'gps-${DateTime.now().microsecondsSinceEpoch}',
          },
        ),
      );
      _kLog('[SyncEngine] Batch sync success: ${res.statusCode}');
    } on DioException catch (e) {
      _kLog('[SyncEngine] DioException: ${e.type} - ${e.message}');
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.response == null) {
        _kLog('[SyncEngine] Connection failed. Enqueueing offline.');
        for (final batch in batches) {
          await OfflineQueue.instance.enqueueGpsBatch(batch);
        }
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
