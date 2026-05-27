import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/queue_repository.dart';
import '../domain/queue_position_model.dart';

// Re-export the main provider for convenience
export '../data/queue_repository.dart' show queuePositionProvider;

// Auto-refresh provider every 30s
final queueAutoRefreshProvider = StreamProvider<QueuePositionModel?>((ref) async* {
  // Initial load
  yield await ref.read(queuePositionProvider.future);

  // Periodic refresh
  while (true) {
    await Future<void>.delayed(const Duration(seconds: 30));
    ref.invalidate(queuePositionProvider);
    yield await ref.read(queuePositionProvider.future);
  }
});
