import 'package:flutter/foundation.dart';

/// Estado global del kill-switch (402). La UI escucha este ChangeNotifier
/// para mostrar/ocultar la pantalla de bloqueo.
class KillSwitchState extends ChangeNotifier {
  bool _active = false;
  String? _message;

  bool get active => _active;
  String? get message => _message;

  void activate([String? msg]) {
    _active = true;
    _message = msg;
    notifyListeners();
  }

  void deactivate() {
    _active = false;
    _message = null;
    notifyListeners();
  }
}