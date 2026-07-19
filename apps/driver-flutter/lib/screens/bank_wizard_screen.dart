import 'package:flutter/material.dart';
import '../theme/tad_theme.dart';

class BankWizardScreen extends StatefulWidget {
  const BankWizardScreen({super.key, required this.onComplete});

  final VoidCallback onComplete;

  @override
  State<BankWizardScreen> createState() => _BankWizardScreenState();
}

class _BankWizardScreenState extends State<BankWizardScreen> {
  int _step = 1;
  String _bank = '';
  String _accountNum = '';
  String _accountType = 'AHORRO';
  String _ownerName = '';
  String _cedula = '';
  String? _error;
  bool _loading = false;

  static const _totalSteps = 5;
  static const _banks = [
    'Banco Popular Dominicano',
    'BHD León',
    'Banreservas',
    'ScotiaBank',
    'APAP',
  ];

  void _goNext() {
    if (!mounted) return;
    setState(() {
      _error = null;
      switch (_step) {
        case 1:
          if (_bank.isEmpty) { _error = 'Selecciona un banco'; return; }
        case 2:
          if (_accountNum.length != 10 || _accountNum.contains(RegExp(r'\D'))) {
            _error = 'El número de cuenta debe tener 10 dígitos'; return;
          }
        case 4:
          if (_ownerName.trim().length < 3) { _error = 'Ingresa tu nombre completo'; return; }
        case 5:
          final clean = _cedula.replaceAll('-', '');
          if (clean.length != 11 || clean.contains(RegExp(r'\D'))) {
            _error = 'La cédula debe tener 11 dígitos'; return;
          }
          _submit();
          return;
      }
      setState(() => _step++);
    });
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      _loading = false;
      widget.onComplete();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Text('←', style: TextStyle(color: TadColors.tadYellow, fontSize: 22)),
          onPressed: () {
            if (_step > 1) {
              setState(() { _step--; _error = null; });
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text('Datos bancarios',
            style: const TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w700)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Text('$_step / $_totalSteps',
                style: const TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w700)),
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
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: TadColors.tadError.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: TadColors.tadError.withValues(alpha: 0.3)),
                      ),
                      child: Text(_error!, style: const TextStyle(color: TadColors.tadError, fontSize: 13)),
                    ),
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
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _loading ? null : _goNext,
                child: _loading
                    ? const SizedBox(
                        width: 22, height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: TadColors.black),
                      )
                    : Text(_step == 5 ? 'GUARDAR DATOS BANCARIOS' : 'CONTINUAR',
                        style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepWidget() {
    switch (_step) {
      case 1: return _stepBank();
      case 2: return _stepAccountNum();
      case 3: return _stepAccountType();
      case 4: return _stepOwnerName();
      case 5: return _stepCedula();
      default: return const SizedBox.shrink();
    }
  }

  Widget _stepBank() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Selecciona tu banco',
            style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 6),
        const Text('Bancos disponibles en República Dominicana',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
        const SizedBox(height: 14),
        ..._banks.map((b) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            onTap: () => setState(() { _bank = b; _error = null; }),
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
                    child: Text(b,
                        style: TextStyle(
                          color: _bank == b ? TadColors.tadYellow : TadColors.tadTextPrimary,
                          fontWeight: FontWeight.w600,
                        )),
                  ),
                  if (_bank == b)
                    const Text('✓', style: TextStyle(color: TadColors.tadYellow, fontSize: 18)),
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
        const Text('Número de cuenta',
            style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 6),
        const Text('Ingresa los 10 dígitos de tu cuenta bancaria',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
        const SizedBox(height: 14),
        TextField(
          keyboardType: TextInputType.number,
          style: const TextStyle(color: TadColors.tadTextPrimary),
          onChanged: (v) {
            final digits = v.replaceAll(RegExp(r'\D'), '');
            if (digits.length <= 10) setState(() { _accountNum = digits; _error = null; });
          },
          decoration: InputDecoration(
            hintText: '1234567890',
            hintStyle: const TextStyle(color: TadColors.tadTextDisabled),
            suffixIcon: _accountNum.length == 10
                ? const Icon(Icons.check_circle, color: TadColors.tadGreen)
                : null,
          ),
        ),
      ],
    );
  }

  Widget _stepAccountType() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Tipo de cuenta',
            style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 6),
        const Text('Selecciona si es cuenta de ahorro o corriente',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
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
      onTap: () => setState(() { _accountType = type; _error = null; }),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: sel ? TadColors.tadSurfaceVariant : TadColors.tadSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: sel ? TadColors.tadYellow : TadColors.tadBorder, width: sel ? 1.5 : 1),
        ),
        alignment: Alignment.center,
        child: Text(type,
            style: TextStyle(
              color: sel ? TadColors.tadYellow : TadColors.tadTextPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            )),
      ),
    );
  }

  Widget _stepOwnerName() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Nombre del titular',
            style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 6),
        const Text('Ingresa el nombre completo del titular de la cuenta',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
        const SizedBox(height: 14),
        TextField(
          style: const TextStyle(color: TadColors.tadTextPrimary),
          onChanged: (v) => setState(() { _ownerName = v; _error = null; }),
          decoration: const InputDecoration(hintText: 'Juan Pérez Rodríguez'),
        ),
      ],
    );
  }

  Widget _stepCedula() {
    final clean = _cedula.replaceAll('-', '');
    final valid = clean.length == 11 && RegExp(r'\D').hasMatch(clean) == false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Cédula de identidad',
            style: TextStyle(color: TadColors.tadTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 6),
        const Text('Ingresa tu número de cédula dominicana (11 dígitos)',
            style: TextStyle(color: TadColors.tadTextSecondary, fontSize: 13)),
        const SizedBox(height: 14),
        TextField(
          keyboardType: TextInputType.number,
          style: const TextStyle(color: TadColors.tadTextPrimary),
          onChanged: (v) {
            final digits = v.replaceAll(RegExp(r'\D'), '');
            if (digits.length <= 11) {
              final formatted = digits.length > 1
                  ? '${digits.substring(0, digits.length > 3 ? 3 : digits.length)}-${digits.substring(digits.length > 3 ? 3 : digits.length)}'
                  : digits;
              setState(() => _cedula = formatted);
            }
          },
          decoration: InputDecoration(
            hintText: '000-0000000-0',
            hintStyle: const TextStyle(color: TadColors.tadTextDisabled),
            suffixIcon: valid
                ? const Icon(Icons.check_circle, color: TadColors.tadGreen)
                : null,
          ),
        ),
      ],
    );
  }
}