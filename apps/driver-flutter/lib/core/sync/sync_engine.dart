import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
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
  final String? _deviceId;
  final String? _driverId;
  final Duration batchInterval;
  final Duration activeStreamDuration;

  final List<GpsPoint> _pending = [];
  Timer? _batchTimer;
  Timer? _activeModeTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _activeMode = false;
  Future<void>? _flushBatchTask;
  bool _isDrainingOfflineQueue = false;

  bool get isActiveMode => _activeMode;

  void start() {
    _batchTimer?.cancel();
    _batchTimer = Timer.periodic(batchInterval, (_) => flushBatch());

    // M6: Al reconectar (online), descargar inmediatamente tanto el buffer
    // en memoria como los batches pendientes persistidos en la cola offline.
    _connectivitySub?.cancel();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (results.contains(ConnectivityResult.wifi) ||
          results.contains(ConnectivityResult.mobile) ||
          results.contains(ConnectivityResult.ethernet)) {
        _kLog('[SyncEngine] Network reconnected — flushing immediate sync');
        flushBatch();
        _flushOfflineQueue();
      }
    });

    // Hidrata la cola persistida y reintenta su envío al arrancar.
    _flushOfflineQueue();
    _startRealtimeListener();
  }

  void stop() {
    _batchTimer?.cancel();
    _activeModeTimer?.cancel();
    _connectivitySub?.cancel();
    _connectivitySub = null;
    _stopRealtimeListener();
  }

  /// Llamado por el plugin de background location con cada nueva coordenada.
  void addPoint(double lat, double lng, double? speedMps, DateTime ts) {
    _pending.add(GpsPoint(lat: lat, lng: lng, speedMps: speedMps, ts: ts));
    if (_pending.length >= 60) flushBatch();
  }

  /// Reenvía lotes persistidos sin eliminarlos hasta obtener ACK completo.
  /// Single-flight evita que arranque y reconexión envíen el mismo lote a la vez.
  Future<void> _flushOfflineQueue() async {
    if (_isDrainingOfflineQueue) return;
    _isDrainingOfflineQueue = true;
    try {
      while (true) {
        final batch = await OfflineQueue.instance.peekFirstBatch();
        if (batch == null) break;

        // Un ACK ambiguo, 402, timeout o 5xx debe dejar el lote persistido.
        if (!await _sendBatch(batch)) break;
        await OfflineQueue.instance.acknowledgeFirstBatch();
      }
    } catch (e) {
      _kLog('[SyncEngine] Offline queue flush failed: $e');
    } finally {
      _isDrainingOfflineQueue = false;
    }
  }

  /// Aceptar únicamente recibos del endpoint real /fleet/track-batch.
  /// count=0 puede ser un replay deduplicado; input siempre debe coincidir.
  Future<bool> _sendBatch(List<GpsPoint> buffer) async {
    if (buffer.isEmpty) return true;
    try {
      final res = await _dio.post(
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

      final status = res.statusCode ?? 0;
      final receipt = res.data;
      final input = receipt is Map ? receipt['input'] : null;
      final count = receipt is Map ? receipt['count'] : null;
      final acknowledged = status >= 200 &&
          status < 300 &&
          input is int &&
          input == buffer.length &&
          count is int &&
          count >= 0 &&
          count <= input;
      if (!acknowledged) {
        _kLog('[SyncEngine] Missing/partial GPS receipt; preserving queue.');
        return false;
      }
      return true;
    } on DioException catch (e) {
      // Dio rejects non-2xx by default, including 402/403/5xx.
      // The point history must survive all rejections, not just timeouts.
      _kLog('[SyncEngine] GPS sync rejected: ${e.type}');
      return false;
    } catch (e) {
      _kLog('[SyncEngine] GPS sync error; batch retained: $e');
      return false;
    }
  }

  /// Persistir antes de transmitir. Nunca vaciar _pending en un error de disco.
  Future<void> flushBatch() {
    final inFlight = _flushBatchTask;
    if (inFlight != null) return inFlight;

    late Future<void> task;
    task = _persistAndFlush().whenComplete(() {
      if (identical(_flushBatchTask, task)) _flushBatchTask = null;
    });
    _flushBatchTask = task;
    return task;
  }

  Future<void> _persistAndFlush() async {
    if (_pending.isNotEmpty) {
      final snapshot = List<GpsPoint>.from(_pending);
      await OfflineQueue.instance.enqueueGpsBatch(snapshot);
      // Only remove the points that were durably queued. New points added
      // during async persistence remain in memory for a later flush.
      _pending.removeRange(0, snapshot.length);
    }
    await _flushOfflineQueue();
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
