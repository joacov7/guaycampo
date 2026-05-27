import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../domain/queue_position_model.dart';
import 'queue_provider.dart';

class QueueScreen extends ConsumerWidget {
  const QueueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queueAsync = ref.watch(queuePositionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cola de espera'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(queuePositionProvider),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: queueAsync.when(
        loading: () => const LoadingOverlay(message: 'Cargando cola...'),
        error: (err, _) => ErrorView(
          message: 'No se pudo cargar la cola.',
          onRetry: () => ref.invalidate(queuePositionProvider),
        ),
        data: (queue) {
          if (queue == null) {
            return const _NoQueueView();
          }
          return _QueueView(queue: queue);
        },
      ),
    );
  }
}

class _QueueView extends StatelessWidget {
  const _QueueView({required this.queue});

  final QueuePositionModel queue;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {},
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _MyPositionHeader(queue: queue),
          ),
          if (queue.entries.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  'Cola completa (${queue.totalInQueue} en espera)',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final entry = queue.entries[index];
                  return _QueueEntryTile(entry: entry);
                },
                childCount: queue.entries.length,
              ),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

class _MyPositionHeader extends StatelessWidget {
  const _MyPositionHeader({required this.queue});

  final QueuePositionModel queue;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCalled = queue.isCalled;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isCalled
              ? [const Color(0xFFF4A261), const Color(0xFFE76F51)]
              : [theme.colorScheme.primary, theme.colorScheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: (isCalled ? const Color(0xFFF4A261) : theme.colorScheme.primary)
                .withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          if (isCalled) ...[
            const Icon(Icons.notifications_active, size: 40, color: Colors.white),
            const SizedBox(height: 8),
            const Text(
              '¡ES TU TURNO!',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            if (queue.scaleNumber != null)
              Text(
                'Dirigite a Báscula ${queue.scaleNumber}',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                ),
              ),
          ] else ...[
            const Text(
              'Tu posición',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 8),
            Text(
              '#${queue.myPosition}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 64,
                fontWeight: FontWeight.w900,
                height: 1,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.access_time, color: Colors.white70, size: 16),
                const SizedBox(width: 4),
                Text(
                  'Espera estimada: ${queue.estimatedWaitLabel}',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _QueueEntryTile extends StatelessWidget {
  const _QueueEntryTile({required this.entry});

  final QueueEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isMe = entry.isCurrentUser;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isMe
            ? theme.colorScheme.primaryContainer
            : theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: isMe
            ? Border.all(color: theme.colorScheme.primary, width: 2)
            : Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isMe
              ? theme.colorScheme.primary
              : theme.colorScheme.surfaceContainerHighest,
          foregroundColor: isMe
              ? theme.colorScheme.onPrimary
              : theme.colorScheme.onSurface,
          child: Text(
            '${entry.position}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        title: Text(
          entry.licensePlate,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: isMe ? theme.colorScheme.onPrimaryContainer : null,
          ),
        ),
        subtitle: Text(
          entry.cropType,
          style: theme.textTheme.bodySmall?.copyWith(
            color: isMe
                ? theme.colorScheme.onPrimaryContainer.withOpacity(0.7)
                : theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: entry.estimatedWaitMinutes != null
            ? Text(
                '~${entry.estimatedWaitMinutes} min',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isMe
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurfaceVariant,
                ),
              )
            : null,
      ),
    );
  }
}

class _NoQueueView extends StatelessWidget {
  const _NoQueueView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.list_alt_outlined,
            size: 64,
            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
          ),
          const SizedBox(height: 16),
          Text('Sin turno activo', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            'No estás en ninguna cola actualmente.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
