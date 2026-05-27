import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shifts/domain/shift_model.dart';
import '../../shifts/presentation/shifts_provider.dart';

// Exposes the active shift's QR code data
final checkinShiftProvider = FutureProvider<ShiftModel?>((ref) async {
  return ref.watch(activeShiftProvider.future);
});
