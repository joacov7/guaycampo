import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_endpoints.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/presentation/login_provider.dart';
import '../../shifts/data/shifts_repository.dart';
import '../domain/queue_position_model.dart';

class QueueRepository {
  QueueRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<QueuePositionModel> getQueuePosition(String myShiftId) async {
    final response = await _dio.get(ApiEndpoints.queuePosition);
    return QueuePositionModel.fromJson(
      response.data as Map<String, dynamic>,
      myShiftId,
    );
  }

  Future<List<QueueEntry>> getFullQueue() async {
    final response = await _dio.get(ApiEndpoints.queue);
    final data = response.data as Map<String, dynamic>;
    final entriesJson = data['queue'] as List? ?? [];
    return entriesJson
        .map((e) => QueueEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final queueRepositoryProvider = Provider<QueueRepository>((ref) {
  return QueueRepository(dio: ref.watch(dioProvider));
});

final queuePositionProvider = FutureProvider<QueuePositionModel?>((ref) async {
  final authState = ref.watch(authStateProvider);
  if (authState is! AuthAuthenticated) return null;

  final repo = ref.watch(queueRepositoryProvider);
  // We use userId as a placeholder — the actual shiftId comes from the shift
  final shiftsRepo = ref.watch(shiftsRepositoryProvider);
  final activeShift = await shiftsRepo.getActiveShift();
  if (activeShift == null) return null;

  return repo.getQueuePosition(activeShift.id);
});
