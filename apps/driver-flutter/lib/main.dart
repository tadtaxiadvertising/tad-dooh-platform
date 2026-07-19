import 'package:flutter/material.dart';
import 'theme/tad_theme.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

void main() => runApp(const TadDriverApp());

class TadDriverApp extends StatelessWidget {
  const TadDriverApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'TAD Driver',
    debugShowCheckedModeBanner: false,
    theme: tadTheme(),
    home: const LoginScreen(),
    routes: {'/dashboard': (_) => const DashboardScreen()},
  );
}