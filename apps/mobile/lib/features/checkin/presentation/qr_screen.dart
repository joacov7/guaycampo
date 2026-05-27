import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/info_row.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../shifts/domain/shift_model.dart';
import 'checkin_provider.dart';

class QrScreen extends ConsumerWidget {
  const QrScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shiftAsync = ref.watch(checkinShiftProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Check-in'),
      ),
      body: shiftAsync.when(
        loading: () => const LoadingOverlay(message: 'Cargando QR...'),
        error: (err, _) => ErrorView(
          message: 'No se pudo cargar el QR.',
          onRetry: () => ref.invalidate(checkinShiftProvider),
        ),
        data: (shift) {
          if (shift == null) {
            return const _NoShiftQr();
          }
          return _QrView(shift: shift);
        },
      ),
    );
  }
}

class _QrView extends StatelessWidget {
  const _QrView({required this.shift});

  final ShiftModel shift;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isValid = shift.isQrValid;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (!isValid)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_outlined, color: theme.colorScheme.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'El QR sólo es válido 30 minutos antes y después del turno.',
                      style: TextStyle(color: theme.colorScheme.onErrorContainer),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          Text(
            'Mostrá este código al operador de la báscula',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: isValid
                ? QrImageView(
                    data: shift.qrCode,
                    version: QrVersions.auto,
                    size: 240,
                    backgroundColor: Colors.white,
                    eyeStyle: QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: theme.colorScheme.primary,
                    ),
                    dataModuleStyle: QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: theme.colorScheme.onSurface,
                    ),
                  )
                : SizedBox(
                    width: 240,
                    height: 240,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.qr_code_2,
                            size: 80,
                            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.3),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No disponible',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  InfoRow(
                    label: 'Turno',
                    value: DateFormatter.formatDateTime(shift.scheduledAt),
                    icon: Icons.schedule,
                  ),
                  InfoRow(
                    label: 'Cultivo',
                    value: shift.cropType,
                    icon: Icons.grass,
                  ),
                  InfoRow(
                    label: 'Planta',
                    value: shift.plantName,
                    icon: Icons.factory_outlined,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (isValid) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check_circle,
                    size: 18,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'QR válido — ${DateFormatter.formatCountdown(shift.scheduledAt.add(const Duration(minutes: 30)))} restante',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'El QR está guardado en tu dispositivo.\nFunciona sin conexión a internet.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoShiftQr extends StatelessWidget {
  const _NoShiftQr();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.qr_code_2,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            Text('Sin turno activo', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Necesitás tener un turno confirmado para ver el QR de check-in.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
