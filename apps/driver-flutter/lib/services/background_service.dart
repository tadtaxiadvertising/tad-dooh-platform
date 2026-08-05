import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator_plus/geolocator_plus.dart';
import 'gps_service.dart';

/// Initializes the background service for persistent location tracking.
Future<void> initializeBackgroundService() async {
  final service = FlutterBackgroundService();

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: false,
      isForegroundMode: true,
      notificationChannelId: 'tad_driver_sync',
      initialNotificationTitle: 'TAD Driver',
      initialNotificationContent: 'Sincronizando ubicación...',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });

    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Start background location updates
  Timer.periodic(const Duration(seconds: 10), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        // En el modo background real, el timer puede ser restringido por el OS
        // pero el stream de geolocator suele mantenerse vivo en foreground service.
        service.setForegroundNotificationInfo(
          title: "TAD Conductor Activo",
          content: "Ruta en progreso. GPS sincronizando...",
        );
      }
    }

    // Aquí podríamos emitir eventos si quisiéramos actualizar la UI
    // service.invoke('update', {"lat": ..., "lng": ...});
  });
  
  // Iniciar el stream de GPS real en este proceso aislado si es necesario, 
  // o simplemente confiar en que el proceso principal mantiene el servicio vivo.
  // Sin embargo, para mayor fiabilidad "de fondo", iniciamos el track aquí.
  GPSService.I.startTracking();
}
