import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Interceptor global para 402 Kill-Switch.
/// Detecta suscripciones vencidas y maneja 401 con re-login silencioso.
class KillSwitchInterceptor extends Interceptor {
  KillSwitchInterceptor({
    required VoidCallback onKillSwitch,
    required VoidCallback onUnauthorized,
    required Future<bool> Function() silentReLogin,
  })  : _onKillSwitch = onKillSwitch,
        _onUnauthorized = onUnauthorized,
        _silentReLogin = silentReLogin;

  final VoidCallback _onKillSwitch;
  final VoidCallback _onUnauthorized;
  final Future<bool> Function() _silentReLogin;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final status = err.response?.statusCode;

    if (status == 402) {
      _onKillSwitch();
      handler.next(err);
      return;
    }

    if (status == 401) {
      _silentReLogin().then((ok) {
        if (!ok) _onUnauthorized();
      });
      return;
    }

    handler.next(err);
  }
}