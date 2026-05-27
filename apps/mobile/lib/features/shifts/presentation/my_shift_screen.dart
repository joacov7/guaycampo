import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/route_constants.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/guay_card.dart';
import '../../../shared/widgets/info_row.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../../../shared/widgets/status_chip.dart';
import '../domain/shift_model.dart';
import 'shifts_provider.dart';

class MyShiftScreen extends ConsumerWidget {
  const MyShiftScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeShiftAsync = ref.watch(activeShiftProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Turno'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(activeShiftProvider),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: activeShiftAsync.when(
        loading: () => const LoadingOverlay(message: 'Cargando tu turno...'),
        error: (err, _) => ErrorView(
          message: 'No se pudo cargar el turno.',
          onRetry: () => ref.invalidate(activeShiftProvider),
        ),
        data: (shift) {
          if (shift == null) {
            return _NoShiftView(
              onViewAll: () => context.go(RouteConstants.history),
            );
          }
          return _ShiftDetailView(shift: shift);
        },
      ),
    );
  }
}

class _NoShiftView extends StatelessWidget {
  const _NoShiftView({required this.onViewAll});

  final VoidCallback onViewAll;

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
              Icons.calendar_today_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
            ),
            const SizedBox(height: 16),
            Text(
              'Sin turnos activos',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No tenés turnos programados para hoy.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: onViewAll,
              icon: const Icon(Icons.history),
              label: const Text('Ver historial'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShiftDetailView extends StatelessWidget {
  const _ShiftDetailView({required this.shift});

  final ShiftModel shift;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status badge
          Row(
            children: [
              StatusChip(status: shift.status),
              const Spacer(),
              Text(
                DateFormatter.formatDate(shift.scheduledAt),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Main info card
          GuayCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Detalles del turno',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Divider(height: 24),
                InfoRow(
                  label: 'Hora',
                  value: DateFormatter.formatTime(shift.scheduledAt),
                  icon: Icons.access_time,
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
                InfoRow(
                  label: 'Dirección',
                  value: shift.plantAddress,
                  icon: Icons.location_on_outlined,
                ),
                if (shift.notes != null && shift.notes!.isNotEmpty)
                  InfoRow(
                    label: 'Notas',
                    value: shift.notes!,
                    icon: Icons.note_outlined,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Action buttons based on status
          _buildActionButtons(context, shift),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, ShiftModel shift) {
    return switch (shift.status) {
      ShiftStatus.pending ||
      ShiftStatus.confirmed =>
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              onPressed: () => context.go(RouteConstants.checkin),
              icon: const Icon(Icons.qr_code_2),
              label: const Text('Mostrar QR para check-in'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => context.go(RouteConstants.queue),
              icon: const Icon(Icons.list),
              label: const Text('Ver cola'),
            ),
          ],
        ),
      ShiftStatus.inPlant || ShiftStatus.waiting => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton.icon(
              onPressed: () => context.go(RouteConstants.queue),
              icon: const Icon(Icons.list),
              label: const Text('Ver posición en cola'),
            ),
          ],
        ),
      ShiftStatus.called => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF4A261).withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF4A261)),
          ),
          child: Column(
            children: [
              const Icon(Icons.notifications_active, size: 32, color: Color(0xFFF4A261)),
              const SizedBox(height: 8),
              Text(
                '¡Es tu turno!',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFF4A261),
                    ),
              ),
              const SizedBox(height: 4),
              const Text('Dirigite a la báscula asignada.'),
            ],
          ),
        ),
      ShiftStatus.completed => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (shift.ticketId != null)
              ElevatedButton.icon(
                onPressed: () => context.go('${RouteConstants.ticket}/${shift.ticketId}'),
                icon: const Icon(Icons.receipt_long_outlined),
                label: const Text('Ver y firmar ticket'),
              ),
          ],
        ),
      _ => const SizedBox.shrink(),
    };
  }
}
