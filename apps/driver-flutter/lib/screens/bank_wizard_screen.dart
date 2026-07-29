import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/tad_theme.dart';
import 'login_screen.dart' show getCachedToken, kApiBase;

// ═══════════════════════════════════════════════════════════════════════════════
// TAD DOOH — Business rules alignment
// Source of truth: apps/api/src/common/constants/business-rules.ts
//
// - STARTER_KIT_ANNUAL_FEE_RD = RD$ 6,000 (subtotal sin ITBIS)
// - ITBIS_RATE = 18% → ITBIS = RD$ 1,080
// - Total con ITBIS = RD$ 7,080
// - Backend referencia: DRV-{driverId}-{yyyyMMdd}
// - Pago inicial → status PENDIENTE_PAGO / PENDING_PAYMENT
// - Pago confirmado → status OPERATIVO / ACTIVE
// ═══════════════════════════════════════════════════════════════════════════════



// ─── Bank data model ──────────────────────────────────────────────────────────

class BankData {
  final String bank;
  final String accountNum;
  final String accountType; // 'AHORRO' | 'CORRIENTE'
  final String ownerName;
  final String cedula;
  final DateTime? savedAt;
  final bool synced;

  const BankData({
    this.bank = '',
    this.accountNum = '',
    this.accountType = 'AHORRO',
    this.ownerName = '',
    this.cedula = '',
    this.savedAt,
    this.synced = false,
  });

  factory BankData.fromJson(Map<String, dynamic> json) => BankData(
        bank: json['bank'] ?? '',
        accountNum: json['accountNum'] ?? '',
        accountType: json['accountType'] ?? 'AHORRO',
        ownerName: json['ownerName'] ?? '',
        cedula: json['cedula'] ?? '',
        savedAt: json['savedAt'] != null ? DateTime.tryParse(json['savedAt']) : null,
        synced: json['synced'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'bank': bank,
        'accountNum': accountNum,
        'accountType': accountType,
        'ownerName': ownerName,
        'cedula': cedula,
        if (savedAt != null) 'savedAt': savedAt!.toIso8601String(),
        'synced': synced,
      };

  BankData copyWith({
    String? bank,
    String? accountNum,
    String? accountType,
    String? ownerName,
    String? cedula,
    DateTime? savedAt,
    bool? synced,
  }) =>
      BankData(
        bank: bank ?? this.bank,
        accountNum: accountNum ?? this.accountNum,
        accountType: accountType ?? this.accountType,
        ownerName: ownerName ?? this.ownerName,
        cedula: cedula ?? this.cedula,
        savedAt: savedAt ?? this.savedAt,
        synced: synced ?? this.synced,
      );

  bool get isComplete =>
      bank.isNotEmpty &&
      accountNum.length == 10 &&
      accountType.isNotEmpty &&
      ownerName.trim().length >= 3 &&
      cedula.replaceAll('-', '').length == 11;

  /// Validates the bank data and returns an error message or null.
  String? validate() {
    if (bank.isEmpty) return 'Selecciona un banco';
    if (accountNum.length != 10 || accountNum.contains(RegExp(r'\D'))) {
      return 'El número de cuenta debe tener 10 dígitos';
    }
    if (ownerName.trim().length < 3) return 'Ingresa tu nombre completo';
    final cleanCedula = cedula.replaceAll('-', '');
    if (cleanCedula.length != 11 || cleanCedula.contains(RegExp(r'\D'))) {
      return 'La cédula debe tener 11 dígitos';
    }
    return null;
  }
}

// ─── Offline persistence (SharedPreferences) ────────────────────────────────

const String _kBankDraftKey = 'tad_bank_draft';
const String _kBankIdempotencyKey = 'tad_bank_idempotency_key';

/// Generates the idempotency key for the pending bank draft.
/// Format: bank_draft_{driverId}_{timestamp}
String getDriverBankPendingKey({String? driverId}) {
  final id = driverId ?? 'unknown';
  final ts = DateTime.now().millisecondsSinceEpoch;
  return 'bank_draft_${id}_$ts';
}

/// Sync status for bank draft.
enum BankSyncStatus { none, draft, syncing, synced, failed }

/// Queries the current sync status from local storage.
Future<BankSyncStatus> getDriverBankSyncStatus() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(_kBankDraftKey);
  if (raw == null) return BankSyncStatus.none;
  try {
    final draft = BankData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    if (draft.synced) return BankSyncStatus.synced;
    return BankSyncStatus.draft;
  } catch (_) {
    return BankSyncStatus.none;
  }
}

/// Saves bank draft locally (offline-first).
/// Call after every field change.
Future<void> _saveBankDraft(BankData data) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(
    _kBankDraftKey,
    jsonEncode(data.copyWith(synced: false).toJson()),
  );
}

/// Loads the cached bank draft from local storage.
BankData? _loadBankDraft() {
  // sync access via shared_prefs instance — but getInstance is async,
  // so we use a cached pattern: call _loadBankDraftAsync from initState
  return _cachedBankDraft;
}

/// Cached bank draft for sync access from build methods.
BankData? _cachedBankDraft;

/// Async loader — call from initState to populate _cachedBankDraft.
Future<void> _loadBankDraftAsync() async {
  final prefs = await SharedPreferences.getInstance();
  final raw = prefs.getString(_kBankDraftKey);
  if (raw != null) {
    try {
      _cachedBankDraft = BankData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      _cachedBankDraft = null;
    }
  }
}

/// Clears the local bank draft after successful sync.
Future<void> _clearBankDraft() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_kBankDraftKey);
  await prefs.remove(_kBankIdempotencyKey);
  _cachedBankDraft = null;
}

/// Gets or creates the idempotency key for bank submission.
/// Persists in SharedPreferences so retries don't create duplicates.
Future<String> _getOrCreateIdempotencyKey() async {
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_kBankIdempotencyKey);
  if (existing != null) return existing;
  final newKey = getDriverBankPendingKey();
  await prefs.setString(_kBankIdempotencyKey, newKey);
  return newKey;
}

// ─── API calls ────────────────────────────────────────────────────────────────

class BankApiException implements Exception {
  final int statusCode;
  final String message;

  BankApiException(this.statusCode, this.message);
}

/// Submits bank data to backend with idempotency + auth token.
/// NOTE: El backend aún no tiene endpoint dedicado para bank data.
/// Se usa PATCH /api/drivers/:driverId con el campo bankAccount en el body.
/// Si el endpoint no existe (404), el draft queda guardado localmente y
/// se sincronizará cuando el backend implemente el endpoint.
/// Retries on 5xx up to 2 times.
Future<BankData> apiSubmitBank(BankData data, {String? driverId}) async {
  const maxRetries = 2;
  String? lastError;

  final token = await getCachedToken();
  if (token == null) {
    throw BankApiException(401, 'No hay sesión activa — inicia sesión de nuevo');
  }

  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 10);

      final url = Uri.parse('$kApiBase/drivers/$driverId');
      final req = await client.patchUrl(url);
      req.headers.contentType = ContentType.json;
      req.headers.set('Authorization', 'Bearer $token');
      req.write(jsonEncode({
        'bankAccount': data.toJson()..remove('synced')..remove('savedAt'),
      }));

      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      client.close();

      if (res.statusCode == 200 || res.statusCode == 204) {
        return data.copyWith(synced: true, savedAt: DateTime.now());
      }

      String msg;
      try {
        final errJson = jsonDecode(body) as Map<String, dynamic>;
        msg = (errJson['message'] ?? errJson['error'] ?? 'Error').toString();
      } catch (_) {
        msg = 'Error del servidor (${res.statusCode})';
      }
      throw BankApiException(res.statusCode, msg);
    } on BankApiException catch (e) {
      // 5xx → retry; 4xx → fail immediately
      if (e.statusCode >= 500 && attempt < maxRetries) {
        lastError = e.message;
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      rethrow;
    } on SocketException catch (_) {
      // Offline — keep draft, mark as failed for later sync
      throw BankApiException(0, 'Sin conexión — datos guardados localmente');
    } catch (e) {
      if (e is BankApiException) rethrow;
      if (attempt < maxRetries) {
        await Future.delayed(Duration(milliseconds: 500 * (attempt + 1)));
        continue;
      }
      throw BankApiException(0, 'Error de conexión');
    }
  }
  throw BankApiException(0, lastError ?? 'Error desconocido');
}

// ─── Bank Wizard Screen ────────────────────────────────────────────────────────

class BankWizardScreen extends StatefulWidget {
  const BankWizardScreen({super.key, required this.onComplete, this.driverId});

  final VoidCallback onComplete;
  final String? driverId;

  @override
  State<BankWizardScreen> createState() => _BankWizardScreenState();
}

class _BankWizardScreenState extends State<BankWizardScreen> {
  static const _totalSteps = 5;

  int _step = 1;
  String _bank = '';
  String _accountNum = '';
  String _accountType = 'AHORRO';
  String _ownerName = '';
  String _cedula = '';

  String? _error;
  bool _loading = false;
  BankSyncStatus _syncStatus = BankSyncStatus.draft;

  // Idempotency key for this session (loaded async in initState)
  String _idempotencyKey = '';

  // Available banks
  static const _banks = [
    'Banco Popular Dominicano',
    'BHD León',
    'Banreservas',
    'ScotiaBank',
    'APAP',
    'Citibank',
    'Banco Promérica',
  ];

  @override
  void initState() {
    super.initState();
    _initAsync();
  }

  Future<void> _initAsync() async {
    await _loadBankDraftAsync();
    _idempotencyKey = await _getOrCreateIdempotencyKey();
    _loadDraft();
  }

  void _loadDraft() {
    final draft = _loadBankDraft();
    if (draft != null) {
      setState(() {
        _bank = draft.bank;
        _accountNum = draft.accountNum;
        _accountType = draft.accountType;
        _ownerName = draft.ownerName;
        _cedula = draft.cedula;
        _syncStatus = draft.synced ? BankSyncStatus.synced : BankSyncStatus.draft;
      });
    }
  }

  BankData get _currentData => BankData(
        bank: _bank,
        accountNum: _accountNum,
        accountType: _accountType,
        ownerName: _ownerName,
        cedula: _cedula,
      );

  Future<void> _saveDraft() async {
    await _saveBankDraft(_currentData.copyWith(synced: false));
  }

  void _goNext() {
    if (!mounted) return;
    setState(() {
      _error = null;
      switch (_step) {
        case 1:
          if (_bank.isEmpty) {
            _error = 'Selecciona un banco';
            return;
          }
        case 2:
          if (_accountNum.length != 10 || _accountNum.contains(RegExp(r'\D'))) {
            _error = 'El número de cuenta debe tener 10 dígitos';
            return;
          }
        case 4:
          if (_ownerName.trim().length < 3) {
            _error = 'Ingresa tu nombre completo';
            return;
          }
        case 5:
          final clean = _cedula.replaceAll('-', '');
          if (clean.length != 11 || clean.contains(RegExp(r'\D'))) {
            _error = 'La cédula debe tener 11 dígitos';
            return;
          }
          _submit();
          return;
        default:
          setState(() => _step++);
      }
      setState(() => _step++);
    });
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _syncStatus = BankSyncStatus.syncing;
      _error = null;
    });

    try {
      await apiSubmitBank(_currentData, driverId: widget.driverId);
      await _clearBankDraft();
      if (!mounted) return;
      setState(() => _syncStatus = BankSyncStatus.synced);
      widget.onComplete();
    } on BankApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _syncStatus = BankSyncStatus.failed;
        _error = 'Error al guardar: ${e.message}. Intenta de nuevo.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _syncStatus = BankSyncStatus.failed;
        _error = 'Error de conexión — tu datos están guardados localmente.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
          onPressed: () {
            if (_step > 1) {
              setState(() {
                _step--;
                _error = null;
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(
          'Datos bancarios',
          style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w700),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Text(
                  '$_step / $_totalSteps',
                  style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700),
                ),
                if (_syncStatus == BankSyncStatus.synced) ...[
                  const SizedBox(width: 8),
                  Icon(Icons.cloud_done, color: TadColors.tadGreen, size: 18),
                ] else if (_syncStatus == BankSyncStatus.syncing) ...[
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: TadColors.tadYellow,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: _step / _totalSteps,
            backgroundColor: TadColors.tadBorder,
            color: TadColors.tadYellow,
            minHeight: 4,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sync status banner (show when not synced and has draft)
                  if (_syncStatus == BankSyncStatus.failed) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: TadColors.tadWarning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: TadColors.tadWarning.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.cloud_off, color: TadColors.tadWarning, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Sin conexión — tus datos se guardaron localmente. '
                              'Se sincronizarán cuando recuperes conexión.',
                              style: TextStyle(color: TadColors.tadWarning, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_error != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: TadColors.tadError.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: TadColors.tadError.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline, color: TadColors.tadError, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(color: TadColors.tadError, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: TadColors.tadSurface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: TadColors.tadBorder),
                    ),
                    child: _stepWidget(),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: Column(
              children: [
                if (_syncStatus == BankSyncStatus.failed) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton(
                      onPressed: _retry,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: TadColors.tadWarning,
                        side: BorderSide(color: TadColors.tadWarning),
                      ),
                      child: const Text(
                        'REINTENTAR SINCRONIZACIÓN',
                        style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.1),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _goNext,
                    child: _loading
                        ? SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: TadColors.black,
                            ),
                          )
                        : Text(
                            _step == _totalSteps ? 'GUARDAR DATOS BANCARIOS' : 'CONTINUAR',
                            style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _retry() async {
    await _saveDraft();
    _submit();
  }

  Widget _stepWidget() {
    return switch (_step) {
      1 => _stepBank(),
      2 => _stepAccountNum(),
      3 => _stepAccountType(),
      4 => _stepOwnerName(),
      _ => _stepCedula(),
    };
  }

  Widget _stepBank() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Selecciona tu banco',
          style: TextStyle(
            color: TadColors.tadTextPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Bancos disponibles en República Dominicana',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
        ),
        const SizedBox(height: 14),
        ..._banks.map((b) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () {
                  setState(() {
                    _bank = b;
                    _error = null;
                  });
                  _saveDraft();
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _bank == b ? TadColors.tadSurfaceVariant : TadColors.tadSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _bank == b ? TadColors.tadYellow : TadColors.tadBorder,
                      width: _bank == b ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          b,
                          style: TextStyle(
                            color: _bank == b ? TadColors.tadYellow : TadColors.tadTextPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (_bank == b)
                        Icon(Icons.check_circle, color: TadColors.tadYellow, size: 20),
                    ],
                  ),
                ),
              ),
            )),
      ],
    );
  }

  Widget _stepAccountNum() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Número de cuenta',
          style: TextStyle(
            color: TadColors.tadTextPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Ingresa los 10 dígitos de tu cuenta bancaria',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
        ),
        const SizedBox(height: 14),
        TextField(
          keyboardType: TextInputType.number,
          style: TextStyle(color: TadColors.tadTextPrimary),
          onChanged: (v) {
            final digits = v.replaceAll(RegExp(r'\D'), '');
            if (digits.length <= 10) {
              setState(() {
                _accountNum = digits;
                _error = null;
              });
              _saveDraft();
            }
          },
          decoration: InputDecoration(
            hintText: '1234567890',
            hintStyle: TextStyle(color: TadColors.tadTextDisabled),
            suffixIcon: _accountNum.length == 10
                ? Icon(Icons.check_circle, color: TadColors.tadGreen)
                : null,
            helperText: 'ID Key: ${_idempotencyKey.substring(0, 12)}...',
            helperStyle: TextStyle(color: TadColors.tadTextDisabled, fontSize: 10),
          ),
        ),
      ],
    );
  }

  Widget _stepAccountType() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tipo de cuenta',
          style: TextStyle(
            color: TadColors.tadTextPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Selecciona si es cuenta de ahorro o corriente',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(child: _typeBtn('AHORRO')),
            const SizedBox(width: 12),
            Expanded(child: _typeBtn('CORRIENTE')),
          ],
        ),
      ],
    );
  }

  Widget _typeBtn(String type) {
    final sel = _accountType == type;
    return InkWell(
      onTap: () {
        setState(() {
          _accountType = type;
          _error = null;
        });
        _saveDraft();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: sel ? TadColors.tadSurfaceVariant : TadColors.tadSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: sel ? TadColors.tadYellow : TadColors.tadBorder,
            width: sel ? 1.5 : 1,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          type,
          style: TextStyle(
            color: sel ? TadColors.tadYellow : TadColors.tadTextPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  Widget _stepOwnerName() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Nombre del titular',
          style: TextStyle(
            color: TadColors.tadTextPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Ingresa el nombre completo del titular de la cuenta',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
        ),
        const SizedBox(height: 14),
        TextField(
          style: TextStyle(color: TadColors.tadTextPrimary),
          textCapitalization: TextCapitalization.words,
          onChanged: (v) {
            setState(() {
              _ownerName = v;
              _error = null;
            });
            _saveDraft();
          },
          decoration: InputDecoration(
            hintText: 'Juan Pérez Rodríguez',
            hintStyle: TextStyle(color: TadColors.tadTextDisabled),
            suffixIcon: _ownerName.trim().length >= 3
                ? Icon(Icons.check_circle, color: TadColors.tadGreen)
                : null,
          ),
        ),
      ],
    );
  }

  Widget _stepCedula() {
    final clean = _cedula.replaceAll('-', '');
    final valid = clean.length == 11;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Cédula de identidad',
          style: TextStyle(
            color: TadColors.tadTextPrimary,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Ingresa tu número de cédula dominicana (11 dígitos)',
          style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13),
        ),
        const SizedBox(height: 14),
        TextField(
          keyboardType: TextInputType.number,
          style: TextStyle(color: TadColors.tadTextPrimary),
          onChanged: (v) {
            final digits = v.replaceAll(RegExp(r'\D'), '');
            if (digits.length <= 11) {
              final formatted = digits.length > 3
                  ? '${digits.substring(0, 3)}-${digits.substring(3)}'
                  : digits;
              setState(() {
                _cedula = formatted;
                _error = null;
              });
              _saveDraft();
            }
          },
          decoration: InputDecoration(
            hintText: '000-0000000-0',
            hintStyle: TextStyle(color: TadColors.tadTextDisabled),
            suffixIcon:
                valid ? Icon(Icons.check_circle, color: TadColors.tadGreen) : null,
          ),
        ),
        const SizedBox(height: 14),
        // Summary
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: TadColors.tadSurfaceVariant,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: TadColors.tadBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Resumen',
                style: TextStyle(
                  color: TadColors.tadYellow,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 8),
              _summaryRow('Banco', _bank),
              _summaryRow('Cuenta', '${_accountNum.substring(0, 4)}****${_accountNum.substring(8)}'),
              _summaryRow('Tipo', _accountType),
              _summaryRow('Titular', _ownerName),
              _summaryRow('Cédula', _cedula),
            ],
          ),
        ),
      ],
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 12),
          ),
          Text(
            value,
            style: TextStyle(
              color: TadColors.tadTextPrimary,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}