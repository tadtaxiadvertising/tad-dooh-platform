import 'package:flutter/material.dart';
import 'theme/tad_theme.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/update_available_screen.dart';
import 'models/hub_data.dart';
import 'services/app_version_service.dart';

/// Versión actual de la app Flutter. Debe sincronizarse con el backend
/// (SystemSetting.driverAppLatestVersion) al publicar cada release.
const String kAppVersion = '1.0.0';

void main() => runApp(const TadDriverApp());

class TadDriverApp extends StatelessWidget {
  const TadDriverApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'TAD Driver',
    debugShowCheckedModeBanner: false,
    theme: tadTheme(),
    home: const _AppVersionGate(child: LoginScreen()),
    routes: {
      '/dashboard': (context) {
        final hub = ModalRoute.of(context)?.settings.arguments as DriverHubData?;
        return DashboardScreen(hub: hub);
      },
    },
  );
}

/// Verifica la versión publicada en el backend al arrancar. Si el backend
/// marca forceUpdate o la versión local < minVersion, redirige a
/// [UpdateAvailableScreen] (no skipeable). Si hay versión opcional, muestra
/// la misma pantalla pero con botón "Más tarde". Si no, mounta el child.
class _AppVersionGate extends StatefulWidget {
  const _AppVersionGate({required this.child});
  final Widget child;

  @override
  State<_AppVersionGate> createState() => _AppVersionGateState();
}

class _AppVersionGateState extends State<_AppVersionGate> {
  final AppVersionService _service = AppVersionService();
  Future<VersionCheckResult>? _checkFuture;

  @override
  void initState() {
    super.initState();
    _checkFuture = _service.checkVersion(currentVersion: kAppVersion);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<VersionCheckResult>(
      future: _checkFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return widget.child;
        }
        final result = snapshot.data;
        if (result == null) return widget.child;
        if (result.status == VersionStatus.required) {
          return UpdateAvailableScreen(
            result: result,
            onLater: () {}, // no-op — required no permite postergar
          );
        }
        if (result.status == VersionStatus.optional) {
          return UpdateAvailableScreen(
            result: result,
            onLater: () {
              setState(() {
                // El usuario postergó: volvemos a la pantalla normal.
                _checkFuture = Future.value(VersionCheckResult(
                  status: VersionStatus.upgraded,
                  info: result.info,
                  currentVersion: result.currentVersion,
                ));
              });
            },
          );
        }
        return widget.child;
      },
    );
  }
}
