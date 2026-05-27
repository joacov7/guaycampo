import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../domain/auth_state.dart';

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _restoreSession();
    return const AuthInitial();
  }

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  Future<void> _restoreSession() async {
    state = const AuthLoading();
    try {
      final user = await _repo.restoreSession();
      if (user != null) {
        state = AuthAuthenticated(
          accessToken: '',
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          tenantSlug: user.tenantSlug,
          avatarUrl: user.avatarUrl,
        );
      } else {
        state = const AuthUnauthenticated();
      }
    } catch (_) {
      state = const AuthUnauthenticated();
    }
  }

  Future<void> login({
    required String tenantSlug,
    required String identifier,
    required String password,
  }) async {
    state = const AuthLoading();
    try {
      final user = await _repo.login(
        tenantSlug: tenantSlug,
        identifier: identifier,
        password: password,
      );
      state = AuthAuthenticated(
        accessToken: '',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        tenantSlug: user.tenantSlug,
        avatarUrl: user.avatarUrl,
      );
    } on AuthException catch (e) {
      state = AuthError(message: e.message);
    } catch (e) {
      state = AuthError(message: 'Error inesperado. Intentá de nuevo.');
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthUnauthenticated();
  }
}

final authStateProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});

final savedTenantSlugProvider = FutureProvider<String?>((ref) async {
  final repo = ref.watch(authRepositoryProvider);
  return repo.getSavedTenantSlug();
});
