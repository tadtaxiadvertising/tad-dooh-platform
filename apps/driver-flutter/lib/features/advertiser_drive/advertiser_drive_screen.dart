import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../core/di/providers.dart';
import '../../theme/tad_theme.dart';

/// Módulo Anunciantes Drive.
///
/// Reglas de negocio:
///  - Selector de cantidad de pantallas: presets 1..5 + escalado libre (6+).
///  - Duración de campaña fijada estrictamente POR MES (badge rojo exclusivo).
///  - Paleta: Verde (tadGreen) para CTAs/confirmaciones; Rojo (tadRed)
///    reservado en exclusiva al plan "por mes". Sin morados ni azules.

const List<int> _screenPresets = [1, 2, 3, 4, 5];
const List<int> _campaignMonthOptions = [1, 3, 6, 12];

class AdvertiserDriveScreen extends ConsumerStatefulWidget {
  const AdvertiserDriveScreen({super.key});

  @override
  ConsumerState<AdvertiserDriveScreen> createState() =>
      _AdvertiserDriveScreenState();
}

class _AdvertiserDriveScreenState extends ConsumerState<AdvertiserDriveScreen> {
  final _formKey = GlobalKey<FormState>();
  final _companyCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _screensCtrl = TextEditingController();

  int _screensCount = 1;
  int _campaignMonths = 1;
  String _category = 'General';
  bool _submitting = false;

  static const int _adSlotSeconds = 30;

  bool get _isCustomScreens => _screensCount > _screenPresets.length;

  @override
  void dispose() {
    _companyCtrl.dispose();
    _contactCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _screensCtrl.dispose();
    super.dispose();
  }

  void _selectPreset(int value) {
    setState(() => _screensCount = value);
  }

  void _activateCustom() {
    setState(() {
      _screensCount =
          _screensCount > _screenPresets.length ? _screensCount : _screenPresets.length + 1;
      _screensCtrl.text = '$_screensCount';
    });
  }

  void _stepCustom(int delta) {
    setState(() {
      _screensCount = _screensCount + delta < _screenPresets.length + 1
          ? _screenPresets.length + 1
          : _screensCount + delta;
      _screensCtrl.text = '$_screensCount';
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await ref.read(dioProvider).post('advertisers', data: {
        'companyName': _companyCtrl.text.trim(),
        'contactName': _contactCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'category': _category,
        'status': 'ACTIVE',
        'screensCount': _screensCount,
        'campaignMonths': _campaignMonths,
        'adFrequencySeconds': _adSlotSeconds,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: TadColors.tadGreen,
          content: Text(
            'Anunciante registrado · Campaña por mes activada',
            style: TextStyle(color: TadColors.black, fontWeight: FontWeight.w800),
          ),
        ),
      );
      Navigator.pop(context);
    } on DioException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: TadColors.tadWarning,
          content: Text(
            'No se pudo registrar (${e.response?.statusCode ?? 'sin red'}). Reintenta.',
            style: const TextStyle(color: TadColors.black, fontWeight: FontWeight.w700),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  InputDecoration _deco(String label) => InputDecoration(
        labelText: label,
      ).applyDefaults(Theme.of(context).inputDecorationTheme);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TadColors.tadDark,
      appBar: AppBar(
        backgroundColor: TadColors.tadDark,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: TadColors.tadYellow),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Anunciantes Drive',
            style: TextStyle(color: TadColors.tadYellow, fontWeight: FontWeight.w800)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // ── 01. Identidad ──
            stitchedCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('01. IDENTIDAD',
                      style: TextStyle(
                          color: TadColors.tadGreen,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3)),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _companyCtrl,
                    decoration: _deco('Empresa *'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _contactCtrl,
                    decoration: _deco('Contacto *'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Requerido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: _deco('Email *'),
                    validator: (v) => (v == null || !v.contains('@')) ? 'Email inválido' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: _deco('Teléfono'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _category,
                    dropdownColor: TadColors.tadSurface,
                    items: const [
                      DropdownMenuItem(value: 'General', child: Text('General / Otros')),
                      DropdownMenuItem(value: 'Gastronomía', child: Text('Gastronomía & Restaurantes')),
                      DropdownMenuItem(value: 'Retail', child: Text('Retail & Tiendas')),
                      DropdownMenuItem(value: 'Servicios', child: Text('Servicios & Salud')),
                      DropdownMenuItem(value: 'Entretenimiento', child: Text('Entretenimiento & Eventos')),
                      DropdownMenuItem(value: 'Transporte', child: Text('Transporte & Logística')),
                    ],
                    onChanged: (v) => setState(() => _category = v ?? 'General'),
                    decoration: _deco('Categoría / Segmento'),
                  ),
                ],
              ),
            ),

            // ── 02. Flota de pantallas ──
            stitchedCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('02. FLOTA DE PANTALLAS',
                      style: TextStyle(
                          color: TadColors.tadGreen,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 3)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final n in _screenPresets)
                        _ScreenChip(
                          label: '$n',
                          selected: !_isCustomScreens && _screensCount == n,
                          onTap: () => _selectPreset(n),
                        ),
                      _ScreenChip(
                        label: '6+',
                        sublabel: 'Más',
                        selected: _isCustomScreens,
                        onTap: _activateCustom,
                      ),
                    ],
                  ),
                  if (_isCustomScreens) ...[
                    const SizedBox(height: 16),
                    Text('CANTIDAD EXACTA DE PANTALLAS',
                        style: TextStyle(
                            color: TadColors.tadTextSecondary,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        IconButton.filledTonal(
                          onPressed: () => _stepCustom(-1),
                          icon: const Icon(Icons.remove, color: TadColors.tadGreen),
                        ),
                        Expanded(
                          child: TextFormField(
                            controller: _screensCtrl,
                            textAlign: TextAlign.center,
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            style: const TextStyle(
                                color: TadColors.tadGreen,
                                fontSize: 22,
                                fontWeight: FontWeight.w900),
                            decoration: _deco(''),
                            onChanged: (v) {
                              final parsed = int.tryParse(v);
                              if (parsed != null && parsed >= _screenPresets.length + 1) {
                                setState(() => _screensCount = parsed);
                              }
                            },
                          ),
                        ),
                        IconButton.filled(
                          onPressed: () => _stepCustom(1),
                          style: IconButton.styleFrom(backgroundColor: TadColors.tadGreen),
                          icon: const Icon(Icons.add, color: TadColors.black),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            // ── 03. Plan de campaña — fijado POR MES (rojo exclusivo) ──
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: TadColors.tadRed.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TadColors.tadRed.withValues(alpha: 0.45)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('DURACIÓN DE CAMPAÑA',
                          style: TextStyle(
                              color: TadColors.tadRed,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: TadColors.tadRed,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text('POR MES',
                            style: TextStyle(
                                color: TadColors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final m in _campaignMonthOptions)
                        ChoiceChip(
                          label: Text(m == 1 ? '1 Mes' : '$m Meses'),
                          selected: _campaignMonths == m,
                          onSelected: (_) => setState(() => _campaignMonths = m),
                          selectedColor: TadColors.white,
                          backgroundColor: TadColors.tadSurfaceVariant,
                          labelStyle: TextStyle(
                            color:
                                _campaignMonths == m ? TadColors.black : TadColors.tadTextPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: _campaignMonths == m
                                  ? TadColors.white
                                  : TadColors.tadBorder,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.sensors, size: 14, color: TadColors.tadGreen),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Reproducción fija: cada anuncio rota exactamente cada $_adSlotSeconds segundos',
                          style: const TextStyle(
                              color: TadColors.tadTextSecondary,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── CTA principal (verde) ──
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            color: TadColors.black, strokeWidth: 2))
                    : const Icon(Icons.storefront, color: TadColors.black),
                label: Text(_submitting ? 'GUARDANDO...' : 'CREAR CUENTA',
                    style: const TextStyle(
                        color: TadColors.black,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5)),
                style: ElevatedButton.styleFrom(backgroundColor: TadColors.tadGreen),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _ScreenChip extends StatelessWidget {
  const _ScreenChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.sublabel,
  });

  final String label;
  final String? sublabel;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final borderColor =
        selected ? TadColors.tadGreen : TadColors.tadBorder;
    return Material(
      color: selected ? TadColors.tadGreen : TadColors.tadSurface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 56,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: selected ? TadColors.black : TadColors.tadTextPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (sublabel != null)
                Text(
                  sublabel!,
                  style: TextStyle(
                    color: selected ? TadColors.black : TadColors.tadTextSecondary,
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
