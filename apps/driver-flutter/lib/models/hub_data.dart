import 'package:flutter/foundation.dart';

enum OnboardingStage { contract, bank, payment, ready }

@immutable
class DriverHubData {
  const DriverHubData({
    this.driverName = 'Carlos Rodríguez',
    this.balance = 3200.0,
    this.projectedEarnings = 8500.0,
    this.activeAds = 8,
    this.activeSlots = 4,
    this.maxSlots = 6,
    this.gpsPoints = 1247,
    this.contractAccepted = true,
    this.bankAccountConfigured = true,
    this.subscriptionPaid = true,
  });

  final String driverName;
  final double balance;
  final double projectedEarnings;
  final int activeAds;
  final int activeSlots;
  final int maxSlots;
  final int gpsPoints;
  final bool contractAccepted;
  final bool bankAccountConfigured;
  final bool subscriptionPaid;
}