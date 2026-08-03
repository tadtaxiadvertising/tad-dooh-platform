import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

/// NotificationService — capa de notificaciones push.
///
/// Diseño:
/// - Usa flutter_local_notifications para mostrar notificaciones locales inmediatas.
/// - Stream nativo (StreamController) para notificar taps — sin dependencias externas.
/// - La capa FCM delega aquí para mostrar el payload.
class NotificationService {
  NotificationService._();

  static final NotificationService _instance = NotificationService._();
  factory NotificationService() => _instance;

  static NotificationService get I => _instance;

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  final StreamController<String?> _onSelect =
      StreamController<String?>.broadcast();
  Stream<String?> get onSelect => _onSelect.stream;

  /// Android channel donde se agrupan alertas de ruta.
  static const String _channelId = 'tad_driver_routes';
  static const String _channelName = 'Alertas de ruta';
  static const String _channelDescription =
      'Notificaciones de nuevas rutas asignadas';

  bool _initialized = false;

  /// Inicializa el plugin (iOS + Android).
  /// No pide permisos todavía.
  Future<void> init() async {
    if (_initialized) return;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    const init = InitializationSettings(android: androidInit, iOS: iosInit);

    await _plugin.initialize(
      init,
      onDidReceiveNotificationResponse: _onTap,
    );

    _initialized = true;
  }

  /// Pide permiso POST_NOTIFICATIONS (Android 13+) y registra el channel.
  Future<bool> requestPermissionAndRegister() async {
    if (!_initialized) await init();

    if (defaultTargetPlatform == TargetPlatform.android) {
      final status = await Permission.notification.request();
      if (!status.isGranted) return false;
    }

    const androidChannel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDescription,
      importance: Importance.high,
      playSound: true,
    );

    final plugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await plugin?.createNotificationChannel(androidChannel);

    return true;
  }

  /// Muestra una notificación tipo "nueva ruta asignada".
  Future<void> showRouteAssigned({
    required String routeId,
    required String routeName,
    String? body,
  }) async {
    if (!_initialized) await init();

    await _plugin.show(
      routeId.hashCode,
      'Nueva ruta asignada',
      body ?? routeName,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDescription,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          color: const Color(0xFFF5B800),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: jsonEncode({'type': 'route', 'id': routeId, 'name': routeName}),
    );
  }

  /// Muestra una notificación informativa genérica.
  Future<void> showInfo({
    required String title,
    required String message,
    String? payload,
  }) async {
    if (!_initialized) await init();

    await _plugin.show(
      title.hashCode,
      title,
      message,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          importance: Importance.defaultImportance,
          priority: Priority.defaultPriority,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(presentAlert: true),
      ),
      payload: payload,
    );
  }

  /// Cancela todas las notificaciones pendientes/mostradas.
  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }

  void _onTap(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null) {
      _onSelect.add(payload);
    }
  }

  void dispose() {
    _onSelect.close();
  }
}
