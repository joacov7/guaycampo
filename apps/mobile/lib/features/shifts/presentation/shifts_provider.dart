import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/shifts_repository.dart';
import '../domain/shift_model.dart';

final myShiftsProvider = FutureProvider<List<ShiftModel>>((ref) async {
  final repo = ref.watch(shiftsRepositoryProvider);
  return repo.getMyShifts();
});

final activeShiftProvider = FutureProvider<ShiftModel?>((ref) async {
  final repo = ref.watch(shiftsRepositoryProvider);
  return repo.getActiveShift();
});

final shiftHistoryProvider = FutureProvider<List<ShiftModel>>((ref) async {
  final repo = ref.watch(shiftsRepositoryProvider);
  return repo.getShiftHistory();
});

final shiftByIdProvider =
    FutureProvider.family<ShiftModel, String>((ref, id) async {
  final repo = ref.watch(shiftsRepositoryProvider);
  return repo.getShiftById(id);
});
