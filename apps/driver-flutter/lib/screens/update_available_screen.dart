import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/tad_theme.dart';
import '../services/app_version_service.dart';

/// Pantalla amarilla full-screen que bloquea la app cuando hay actualización
/// requerida. Si [required] es false, el usuario puede postergar.
///
/// Diseño: Linear/Vercel-like. Fondo negro, acentos amarillo TAD (#FFD400),
/// tipografía grotesk, espaciado generoso. Sin grid patterns ni highlights.
class UpdateAvailableScreen extends StatelessWidget {
  const UpdateAvailableScreen({
    super.key,
    required this.result,
    required this.onLater,
  });

  final VersionCheckResult result;
  final VoidCallback onLater;

  @override
  Widget build(BuildContext context) {
    final isRequired = result.status == VersionStatus.required;
    final info = result.info;
    final colorSeed = isRequired ? const Color(0xFFEF4444) : TadColors.tadYellow;

    return Scaffold(
      backgroundColor: Colors.black,
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: colorSeed.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    isRequired ? Icons.shield_outlined : Icons.system_update_alt_outlined,
                    color: colorSeed,
                    size: 30,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  isRequired ? 'ACTUALIZACIÓN REQUERIDA' : 'NUEVA VERSIÓN DISPONIBLE',
                  style: const TextStyle(
                    color: Color(0xFFB0B0B0),
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.6,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  isRequired
                      ? 'Tu versión dejó de ser compatible'
                      : 'Mejora el rendimiento y desbloquea nuevas funciones',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1.15,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A1A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF2A2A2A)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Versión instalada',
                            style: TextStyle(
                              color: Color(0xFF888888),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            result.currentVersion,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const Icon(Icons.arrow_forward, color: Color(0xFF555555), size: 18),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Disponible',
                            style: TextStyle(
                              color: Color(0xFF888888),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            info?.latestVersion ?? '—',
                            style: TextStyle(
                              color: TadColors.tadYellow,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (info?.releaseNotes.isNotEmpty ?? false) ...[
                  const SizedBox(height: 20),
                  const Text(
                    'NOTAS DE LA VERSIÓN',
                    style: TextStyle(
                      color: Color(0xFF888888),
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.6,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121212),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF1F1F1F),
                        ),
                      ),
                      child: SingleChildScrollView(
                        child: Text(
                          info!.releaseNotes,
                          style: const TextStyle(
                            color: Color(0xFFCCCCCC),
                            fontSize: 13,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                ] else
                  const Spacer(),
                const SizedBox(height: 24),
                _PrimaryButton(
                  label: 'ACTUALIZAR AHORA',
                  color: TadColors.tadYellow,
                  onTap: () => _launchUrl(info?.downloadUrl),
                ),
                if (!isRequired) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: onLater,
                    style: TextButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      foregroundColor: const Color(0xFF888888),
                    ),
                    child: const Text(
                      'Más tarde',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                ],
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _launchUrl(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.color, required this.onTap});
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          height: 56,
          width: double.infinity,
          child: Text(label, style: const TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w800,
            fontSize: 14,
            letterSpacing: 1.2,
          )),
        ),
      ),
    );
  }
}
