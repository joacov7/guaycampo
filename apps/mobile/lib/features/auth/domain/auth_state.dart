import 'package:flutter/foundation.dart';

@immutable
sealed class AuthState {
  const AuthState();
}

final class AuthInitial extends AuthState {
  const AuthInitial();
}

final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated({
    required this.accessToken,
    required this.userId,
    required this.userName,
    required this.userEmail,
    required this.tenantSlug,
    this.avatarUrl,
  });

  final String accessToken;
  final String userId;
  final String userName;
  final String userEmail;
  final String tenantSlug;
  final String? avatarUrl;

  AuthAuthenticated copyWith({
    String? accessToken,
    String? userId,
    String? userName,
    String? userEmail,
    String? tenantSlug,
    String? avatarUrl,
  }) {
    return AuthAuthenticated(
      accessToken: accessToken ?? this.accessToken,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      tenantSlug: tenantSlug ?? this.tenantSlug,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

final class AuthError extends AuthState {
  const AuthError({required this.message});

  final String message;
}
