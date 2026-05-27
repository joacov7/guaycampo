import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/ticket_repository.dart';
import '../domain/scale_ticket_model.dart';

final ticketByIdProvider =
    FutureProvider.family<ScaleTicketModel, String>((ref, id) async {
  final repo = ref.watch(ticketRepositoryProvider);
  return repo.getTicketById(id);
});

class SignatureNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submitSignature({
    required String ticketId,
    required String signatureBase64,
  }) async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(ticketRepositoryProvider);
      await repo.submitSignature(
        ticketId: ticketId,
        signatureBase64: signatureBase64,
      );
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }
}

final signatureProvider =
    AsyncNotifierProvider<SignatureNotifier, void>(() => SignatureNotifier());
