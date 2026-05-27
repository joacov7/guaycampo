import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/route_constants.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../shared/widgets/guay_card.dart';
import '../../../shared/widgets/status_chip.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/presentation/login_provider.dart';
import '../../queue/data/queue_repository.dart';
import '../../shifts/domain/shift_model.dart';
import '../../shifts/presentation/shifts_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final activeShiftAsync = ref.watch(activeShiftProvider);
    final theme = Theme.of(context);

    String userName = '';
    if (authState is AuthAuthenticated) {
      userName = authState.userName;
    }

    return Scaffold(
      backgroundColor: theme.colorScheme.surfaceContainerLowest,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            backgroundColor: theme.colorScheme.surface,
            surfaceTintColor: Colors.transparent,
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.agriculture,
                    size: 18,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 8),
                const Text('GuayCampo'),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_outlined),
                onPressed: () {
                  ref.invalidate(activeShiftProvider);
                  ref.invalidate(queuePositionProvider);
                },
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _greeting(),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    userName.isNotEmpty ? userName : 'Chofer',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverToBoxAdapter(
              child: activeShiftAsync.when(
                loading: () => const _ShiftLoadingCard(),
                error: (_, __) => _NoShiftCard(
                  onViewHistory: () => context.go(RouteConstants.history),
                ),
                data: (shift) {
                  if (shift == null) {
                    return _NoShiftCard(
                      onViewHistory: () => context.go(RouteConstants.history),
                    );
                  }
                  return _ActiveShiftCard(shift: shift);
                },
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                'Accesos rápidos',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.4,
              ),
              delegate: SliverChildListDelegate([
                _QuickAccessCard(
                  icon: Icons.qr_code_2,
                  label: 'QR Check-in',
                  color: theme.colorScheme.primary,
                  onTap: () => context.go(RouteConstants.checkin),
                ),
                _QuickAccessCard(
                  icon: Icons.list_alt_outlined,
                  label: 'Cola de espera',
                  color: theme.colorScheme.secondary,
                  onTap: () => context.go(RouteConstants.queue),
                ),
                _QuickAccessCard(
                  icon: Icons.receipt_long_outlined,
                  label: 'Mis tickets',
                  color: const Color(0xFFF4A261),
                  onTap: () => context.go(RouteConstants.history),
                ),
                _QuickAccessCard(
                  icon: Icons.history_outlined,
                  label: 'Historial',
                  color: const Color(0xFF6B7280),
                  onTap: () => context.go(RouteConstants.history),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días,';
    if (hour < 18) return 'Buenas tardes,';
    return 'Buenas noches,';
  }
}

class _ActiveShiftCard extends StatelessWidget {
  const _ActiveShiftCard({required this.shift});

  final ShiftModel shift;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GuayCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today, size: 18, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  'Turno de hoy',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const Spacer(),
                StatusChip(status: shift.status, small: true),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.access_time, size: 16, color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 6),
                    Text(DateFormatter.formatTime(shift.scheduledAt)),
                    const Spacer(),
                    Text(
                      DateFormatter.formatRelative(shift.scheduledAt),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  shift.cropType,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  shift.plantName,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                _buildActionButton(context, shift),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, ShiftModel shift) {
    return switch (shift.status) {
      ShiftStatus.pending || ShiftStatus.confirmed => ElevatedButton.icon(
          onPressed: () => context.go(RouteConstants.checkin),
          icon: const Icon(Icons.qr_code_2, size: 20),
          label: const Text('Mostrar QR para check-in'),
        ),
      ShiftStatus.inPlant || ShiftStatus.waiting => OutlinedButton.icon(
          onPressed: () => context.go(RouteConstants.queue),
          icon: const Icon(Icons.list, size: 20),
          label: const Text('Ver posición en cola'),
        ),
      ShiftStatus.called => Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF4A261).withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF4A261)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.notifications_active, color: Color(0xFFF4A261)),
              const SizedBox(width: 8),
              const Text(
                '¡ES TU TURNO!',
                style: TextStyle(
                  color: Color(0xFFF4A261),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ShiftStatus.completed when shift.ticketId != null => ElevatedButton.icon(
          onPressed: () => context.go('${RouteConstants.ticket}/${shift.ticketId}'),
          icon: const Icon(Icons.receipt_long_outlined, size: 20),
          label: const Text('Ver y firmar ticket'),
        ),
      _ => const SizedBox.shrink(),
    };
  }
}

class _NoShiftCard extends StatelessWidget {
  const _NoShiftCard({required this.onViewHistory});

  final VoidCallback onViewHistory;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GuayCard(
      child: Column(
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 48,
            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
          ),
          const SizedBox(height: 12),
          Text(
            'Sin turnos para hoy',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No tenés turnos programados para hoy.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onViewHistory,
            icon: const Icon(Icons.history, size: 18),
            label: const Text('Ver historial de turnos'),
          ),
        ],
      ),
    );
  }
}

class _ShiftLoadingCard extends StatelessWidget {
  const _ShiftLoadingCard();

  @override
  Widget build(BuildContext context) {
    return GuayCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 16,
            width: 120,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            height: 24,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: 16,
            width: 200,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  const _QuickAccessCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
