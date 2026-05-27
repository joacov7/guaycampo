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
import '../domain/scale_ticket_model.dart';
import 'ticket_provider.dart';

class TicketScreen extends ConsumerWidget {
  const TicketScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketAsync = ref.watch(ticketByIdProvider(ticketId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket de pesaje'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(ticketByIdProvider(ticketId)),
          ),
        ],
      ),
      body: ticketAsync.when(
        loading: () => const LoadingOverlay(message: 'Cargando ticket...'),
        error: (err, _) => ErrorView(
          message: 'No se pudo cargar el ticket.',
          onRetry: () => ref.invalidate(ticketByIdProvider(ticketId)),
        ),
        data: (ticket) => _TicketView(ticket: ticket),
      ),
    );
  }
}

class _TicketView extends StatelessWidget {
  const _TicketView({required this.ticket});

  final ScaleTicketModel ticket;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ticket #${ticket.ticketNumber}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      DateFormatter.formatDateTime(ticket.createdAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              TicketStatusChip(status: ticket.status),
            ],
          ),
          const SizedBox(height: 16),

          // Weights — most prominent section
          _WeightsCard(ticket: ticket),
          const SizedBox(height: 12),

          // General info
          GuayCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Datos generales',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Divider(height: 20),
                InfoRow(label: 'Patente', value: ticket.licensePlate, icon: Icons.local_shipping_outlined),
                InfoRow(label: 'Cultivo', value: ticket.cropType, icon: Icons.grass),
                InfoRow(label: 'Productor', value: ticket.producerName, icon: Icons.person_outlined),
                if (ticket.operatorName != null)
                  InfoRow(label: 'Operador', value: ticket.operatorName!, icon: Icons.badge_outlined),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Lab results
          if (ticket.labResults.isNotEmpty) ...[
            _LabResultsCard(results: ticket.labResults),
            const SizedBox(height: 12),
          ],

          // Adjustments
          if (ticket.adjustments.isNotEmpty) ...[
            _AdjustmentsCard(adjustments: ticket.adjustments),
            const SizedBox(height: 12),
          ],

          // Notes
          if (ticket.notes != null && ticket.notes!.isNotEmpty) ...[
            GuayCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Observaciones',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(ticket.notes!, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Signature status
          _SignatureSection(ticket: ticket),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _WeightsCard extends StatelessWidget {
  const _WeightsCard({required this.ticket});

  final ScaleTicketModel ticket;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _WeightItem(
                  label: 'Bruto',
                  value: ticket.grossWeightKg,
                  large: false,
                ),
              ),
              Container(width: 1, height: 48, color: Colors.white24),
              Expanded(
                child: _WeightItem(
                  label: 'Tara',
                  value: ticket.taraWeightKg,
                  large: false,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(height: 1, color: Colors.white24),
          const SizedBox(height: 12),
          _WeightItem(
            label: 'Peso Neto',
            value: ticket.netWeightKg,
            large: true,
          ),
          if (ticket.adjustments.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Neto ajustado: ${_formatWeight(ticket.adjustedNetWeight)}',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
          ],
        ],
      ),
    );
  }

  String _formatWeight(double kg) {
    if (kg >= 1000) {
      return '${(kg / 1000).toStringAsFixed(2)} t';
    }
    return '${kg.toStringAsFixed(0)} kg';
  }
}

class _WeightItem extends StatelessWidget {
  const _WeightItem({
    required this.label,
    required this.value,
    required this.large,
  });

  final String label;
  final double value;
  final bool large;

  String get _formatted {
    if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(3)} t';
    }
    return '${value.toStringAsFixed(0)} kg';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.white70,
            fontSize: large ? 14 : 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _formatted,
          style: TextStyle(
            color: Colors.white,
            fontSize: large ? 28 : 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _LabResultsCard extends StatelessWidget {
  const _LabResultsCard({required this.results});

  final List<LabResult> results;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GuayCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Resultados de laboratorio',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const Divider(height: 20),
          ...results.map(
            (r) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    r.isWithinSpec ? Icons.check_circle : Icons.warning,
                    size: 16,
                    color: r.isWithinSpec
                        ? theme.colorScheme.primary
                        : theme.colorScheme.error,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(r.name)),
                  Text(
                    '${r.value.toStringAsFixed(2)} ${r.unit}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: r.isWithinSpec ? null : theme.colorScheme.error,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AdjustmentsCard extends StatelessWidget {
  const _AdjustmentsCard({required this.adjustments});

  final List<WeightAdjustment> adjustments;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GuayCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Bonificaciones y descuentos',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const Divider(height: 20),
          ...adjustments.map(
            (a) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    a.isDeduction ? Icons.remove_circle_outline : Icons.add_circle_outline,
                    size: 16,
                    color: a.isDeduction
                        ? theme.colorScheme.error
                        : theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(a.name)),
                  Text(
                    '${a.percentage.toStringAsFixed(1)}%',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${a.kgAmount > 0 ? '+' : ''}${a.kgAmount.toStringAsFixed(0)} kg',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: a.isDeduction
                          ? theme.colorScheme.error
                          : theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SignatureSection extends StatelessWidget {
  const _SignatureSection({required this.ticket});

  final ScaleTicketModel ticket;

  @override
  Widget build(BuildContext context) {
    if (ticket.isSigned) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF2D6A4F).withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF2D6A4F).withOpacity(0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.verified, color: Color(0xFF2D6A4F)),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Ticket firmado digitalmente por el chofer.',
                style: TextStyle(color: Color(0xFF2D6A4F)),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: () => context.go('${RouteConstants.signature}/${ticket.id}'),
          icon: const Icon(Icons.draw_outlined),
          label: const Text('Firmar ticket'),
        ),
      ],
    );
  }
}

class TicketStatusChip extends StatelessWidget {
  const TicketStatusChip({super.key, required this.status});

  final TicketStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (color, bgColor) = switch (status) {
      TicketStatus.approved => (theme.colorScheme.primary, theme.colorScheme.primaryContainer),
      TicketStatus.rejected => (theme.colorScheme.error, theme.colorScheme.errorContainer),
      TicketStatus.conditional => (const Color(0xFFF4A261), const Color(0xFFFFF3E0)),
      TicketStatus.pending => (theme.colorScheme.onSurfaceVariant, theme.colorScheme.surfaceContainerHighest),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
