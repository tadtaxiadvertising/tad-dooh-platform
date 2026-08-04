import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../theme/tad_theme.dart';
import '../core/di/providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ─── Direct Upload Button ─────────────────────────────────────────────────────

/// Upload state for the direct upload flow.
enum UploadState { idle, picking, uploading, success, error }

/// CTA button that triggers direct content upload to the TAD device.
class DirectUploadButton extends ConsumerStatefulWidget {
  const DirectUploadButton({super.key, required this.deviceId});

  final String deviceId;

  @override
  ConsumerState<DirectUploadButton> createState() => _DirectUploadButtonState();
}

class _DirectUploadButtonState extends ConsumerState<DirectUploadButton> {
  UploadState _state = UploadState.idle;
  String? _fileName;
  String? _error;

  Future<void> _pickAndUpload() async {
    setState(() {
      _state = UploadState.picking;
      _error = null;
    });

    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );

      if (result == null || result.files.isEmpty) {
        setState(() => _state = UploadState.idle);
        return;
      }

      final file = result.files.first;
      setState(() {
        _fileName = file.name;
        _state = UploadState.uploading;
      });

      final dio = ref.read(dioProvider);
      final formData = FormData.fromMap({
        'deviceId': widget.deviceId,
        'file': await MultipartFile.fromFile(file.path!, filename: file.name),
      });

      await dio.post('/fleet/devices/${widget.deviceId}/upload', data: formData);

      if (mounted) setState(() => _state = UploadState.success);
    } on DioException catch (e) {
      if (mounted) {
        setState(() {
          _state = UploadState.error;
          _error = (e.response?.data as Map?)?['message']?.toString() ?? 'Error de red';
        });
      }
    } on PlatformException catch (e) {
      if (mounted) {
        setState(() {
          _state = UploadState.error;
          _error = e.message ?? 'Error al seleccionar';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _state = UploadState.error;
          _error = 'Error inesperado';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: _state == UploadState.uploading ? null : _pickAndUpload,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: TadColors.tadSurface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: TadColors.tadBorder),
        ),
        child: Row(
          children: [
            Icon(
              _state == UploadState.success
                  ? Icons.check_circle
                  : _state == UploadState.error
                      ? Icons.error_outline
                      : Icons.cloud_upload_outlined,
              color: _state == UploadState.success
                  ? TadColors.tadGreen
                  : _state == UploadState.error
                      ? TadColors.tadError
                      : TadColors.tadYellow,
              size: 22,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Subir contenido',
                    style: TextStyle(
                      color: TadColors.tadTextPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  if (_fileName != null && _state == UploadState.uploading)
                    Text(
                      'Subiendo $_fileName...',
                      style: TextStyle(
                        color: TadColors.tadTextSecondary,
                        fontSize: 12,
                      ),
                    )
                  else if (_state == UploadState.success)
                    Text(
                      '¡Subido con éxito!',
                      style: TextStyle(
                        color: TadColors.tadGreen,
                        fontSize: 12,
                      ),
                    )
                  else if (_state == UploadState.error)
                    Text(
                      _error ?? 'Error',
                      style: TextStyle(
                        color: TadColors.tadError,
                        fontSize: 12,
                      ),
                    )
                  else
                    Text(
                      'Envía contenido a tu dispositivo',
                      style: TextStyle(
                        color: TadColors.tadTextSecondary,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (_state == UploadState.uploading)
              SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: TadColors.tadYellow,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── QR Referral Modal ───────────────────────────────────────────────────────

/// QR code data payload for driver referrals.
class ReferralQRData {
  final String driverId;
  final String referralCode;
  final DateTime generatedAt;

  ReferralQRData({
    required this.driverId,
    required this.referralCode,
    DateTime? generatedAt,
  }) : generatedAt = generatedAt ?? DateTime.now();

  String get url => 'https://tadtaxi.com/referrals/conductor/$referralCode';

  Map<String, dynamic> toJson() => {
        'driverId': driverId,
        'referralCode': referralCode,
        'generatedAt': generatedAt.toIso8601String(),
      };
}

/// Shows the driver referral QR modal.
/// Link: https://tadtaxi.com/referrals/conductor/{referralCode}
class ReferralQRModal extends StatefulWidget {
  const ReferralQRModal({
    super.key,
    required this.driverId,
    required this.referralCode,
    this.sharedCount = 0,
    this.onShare,
  });

  final String driverId;
  final String referralCode;
  final int sharedCount;
  final VoidCallback? onShare;

  /// Shows the modal as a dialog.
  static void show(
    BuildContext context, {
    required String driverId,
    required String referralCode,
    int sharedCount = 0,
    VoidCallback? onShare,
  }) {
    showDialog(
      context: context,
      builder: (_) => ReferralQRModal(
        driverId: driverId,
        referralCode: referralCode,
        sharedCount: sharedCount,
        onShare: onShare,
      ),
    );
  }

  @override
  State<ReferralQRModal> createState() => _ReferralQRModalState();
}

class _ReferralQRModalState extends State<ReferralQRModal> {
  late final ReferralQRData _qrData;

  @override
  void initState() {
    super.initState();
    _qrData = ReferralQRData(
      driverId: widget.driverId,
      referralCode: widget.referralCode,
    );
  }

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _qrData.url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Enlace copiado', style: TextStyle(color: TadColors.tadTextPrimary)),
        backgroundColor: TadColors.tadSurface,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: TadColors.tadSurface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Invitar compañeros',
                  style: TextStyle(
                    color: TadColors.tadYellow,
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: TadColors.tadTextSecondary, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Comparte tu código QR con conductores que quieras invitar a TAD.',
              style: TextStyle(
                color: TadColors.tadTextSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),

            // QR Code
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  QrImageView(
                    data: _qrData.url,
                    version: QrVersions.auto,
                    size: 160.0,
                    backgroundColor: Colors.white,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.referralCode,
                    style: TextStyle(
                      color: TadColors.tadDark,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Stats
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: TadColors.tadSurfaceVariant,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: TadColors.tadBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.share, color: TadColors.tadTextSecondary, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    'Compartido ${widget.sharedCount} veces',
                    style: TextStyle(
                      color: TadColors.tadTextSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _copyLink,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: TadColors.tadTextPrimary,
                      side: BorderSide(color: TadColors.tadBorder),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.copy, size: 18),
                    label: const Text('Copiar enlace'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: widget.onShare,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: TadColors.tadYellow,
                      foregroundColor: TadColors.black,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.share, size: 18),
                    label: const Text('Compartir'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

