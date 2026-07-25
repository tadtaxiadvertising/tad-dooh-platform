import 'package:flutter/material.dart';

class TadColors {
  TadColors._();

  static const tadYellow = Color(0xFFFAD400);
  static const tadDark = Color(0xFF0C0F14);
  static const tadSurface = Color(0xFF161B22);
  static const tadSurfaceVariant = Color(0xFF1C2128);
  static const tadRed = Color(0xFFE51636);
  static const tadGreen = Color(0xFF22C55E);
  static const tadError = Color(0xFFF85149);
  static const tadWarning = Color(0xFFD29922);
  static const tadInfo = Color(0xFF58A6FF);
  static const tadTextPrimary = Color(0xFFF0F6FC);
  static const tadTextSecondary = Color(0xFF8B949E);
  static const tadTextDisabled = Color(0xFF484F58);
  static const tadBorder = Color(0xFF30363D);
  static const black = Color(0xFF000000);
  static const white = Color(0xFFFFFFFF);
}

ThemeData tadTheme() {
  final base = ThemeData.dark(useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: TadColors.tadDark,
    colorScheme: const ColorScheme.dark(
      primary: TadColors.tadYellow,
      onPrimary: TadColors.black,
      secondary: TadColors.tadYellow,
      surface: TadColors.tadSurface,
      onSurface: TadColors.tadTextPrimary,
      error: TadColors.tadError,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: TadColors.tadSurface,
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: TadColors.tadYellow, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: TadColors.tadBorder, width: 1),
      ),
      labelStyle: const TextStyle(color: TadColors.tadTextSecondary),
      hintStyle: const TextStyle(color: TadColors.tadTextDisabled),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: TadColors.tadYellow,
        foregroundColor: TadColors.black,
        minimumSize: const Size.fromHeight(48),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
      ),
    ),
  );
}

Widget stitchedCard({
  required Widget child,
  EdgeInsets padding = const EdgeInsets.all(16),
  VoidCallback? onTap,
}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: double.infinity,
          padding: padding,
          decoration: BoxDecoration(
            color: TadColors.tadSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: child,
        ),
      ),
    ),
  );
}