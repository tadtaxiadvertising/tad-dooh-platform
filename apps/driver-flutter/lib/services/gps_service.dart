import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator_plus/geolocator_plus.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import '../core/sync/sync_engine.dart';

/// Single-instance GPS tracker used by the driver app.
///
/// Tracks foreground position, calculates distance in meters,
/// feeds each fix to [HybridSyncEngine] for batch transmission to
/// POST /fleet/track-batch, and exposes a manual sync hook.
final class GPSService {
  GPSService._();
  static final GPSService I = GPSService._();

  Position? _lastPosition;
  double _totalDistanceMeters = 0.0;
  StreamSubscription<Position>? _subscription;
  bool _tracking = false;
  HybridSyncEngine? _syncEngine;

  bool get isTracking => _tracking;
  Position? get lastPosition => _lastPosition;
  double get totalDistanceMeters => _totalDistanceMeters;
  int get pointCount => _subscription != null ? 1 : 0;

  /// Wire the sync engine so every GPS fix is buffered and flushed
  /// to the backend every 5 minutes. Call once after login.
  void attachSyncEngine(HybridSyncEngine engine) {
    _syncEngine = engine;
    engine.start();
    debugPrint('[GPS] sync engine attached + started');
  }

  /// Detach and dispose the sync engine (e.g. on logout).
  void detachSyncEngine() {
    _syncEngine?.stop();
    _syncEngine = null;
  }

  Future<bool> ensurePermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final result = await Geolocator.requestPermission();
      if (result == LocationPermission.denied) return false;
      permission = result;
    }
    if (permission == LocationPermission.deniedForever) {
      return false;
    }
    return true;
  }

  Future<void> startTracking() async {
    if (_tracking) return;
    final ok = await ensurePermission();
    if (!ok) {
      debugPrint('[GPS] permission denied — tracking not started');
      return;
    }

    _tracking = true;
    const settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 5,
    );
    _subscription = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition);
    
    // Start background service to prevent OS from killing the process
    final background = FlutterBackgroundService();
    if (!(await background.isRunning())) {
      await background.startService();
    }
    
    debugPrint('[GPS] tracking started (with background service)');
  }

  Future<void> stopTracking() async {
    await _subscription?.cancel();
    _subscription = null;
    _tracking = false;
    
    // Stop background service
    FlutterBackgroundService().invoke('stopService');
    
    debugPrint('[GPS] tracking stopped');
  }

  void _onPosition(Position position) {
    if (_lastPosition != null) {
      final distance = Geolocator.distanceBetween(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        position.latitude,
        position.longitude,
      );
      _totalDistanceMeters += distance;
    }
    _lastPosition = position;

    // Feed the sync engine for backend batch transmission.
    final speedMps = position.speed;
    _syncEngine?.addPoint(
      position.latitude,
      position.longitude,
      speedMps >= 0 ? speedMps.toDouble() : null,
      position.timestamp,
    );
  }

  /// Manual sync: grab a fresh fix and flush the pending buffer.
  Future<void> syncNow() async {
    try {
      await Geolocator.getCurrentPosition();
    } catch (_) {}
    // Flush any buffered points immediately.
    await _syncEngine?.flushBatch();
  }
}
