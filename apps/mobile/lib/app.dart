import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/constants/route_constants.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/domain/auth_state.dart';
import 'features/auth/presentation/login_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/checkin/presentation/qr_screen.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/profile/presentation/profile_screen.dart';
import 'features/queue/presentation/queue_screen.dart';
import 'features/shifts/presentation/my_shift_screen.dart';
import 'features/shifts/presentation/shift_history_screen.dart';
import 'features/ticket/presentation/signature_screen.dart';
import 'features/ticket/presentation/ticket_screen.dart';

class GuayCampoApp extends ConsumerWidget {
  const GuayCampoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final router = _buildRouter(authState);

    return MaterialApp.router(
      title: 'GuayCampo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      locale: const Locale('es', 'AR'),
    );
  }

  GoRouter _buildRouter(AuthState authState) {
    return GoRouter(
      initialLocation: RouteConstants.login,
      redirect: (context, state) {
        final isAuthenticated = authState is AuthAuthenticated;
        final isLoginRoute = state.matchedLocation == RouteConstants.login;

        if (!isAuthenticated && !isLoginRoute) {
          return RouteConstants.login;
        }
        if (isAuthenticated && isLoginRoute) {
          return RouteConstants.home;
        }
        return null;
      },
      routes: [
        GoRoute(
          path: RouteConstants.login,
          name: RouteConstants.loginName,
          builder: (context, state) => const LoginScreen(),
        ),
        ShellRoute(
          builder: (context, state, child) => MainShell(child: child),
          routes: [
            GoRoute(
              path: RouteConstants.home,
              name: RouteConstants.homeName,
              builder: (context, state) => const HomeScreen(),
            ),
            GoRoute(
              path: RouteConstants.shift,
              name: RouteConstants.shiftName,
              builder: (context, state) => const MyShiftScreen(),
            ),
            GoRoute(
              path: RouteConstants.queue,
              name: RouteConstants.queueName,
              builder: (context, state) => const QueueScreen(),
            ),
            GoRoute(
              path: RouteConstants.checkin,
              name: RouteConstants.checkinName,
              builder: (context, state) => const QrScreen(),
            ),
            GoRoute(
              path: '${RouteConstants.ticket}/:id',
              name: RouteConstants.ticketName,
              builder: (context, state) {
                final ticketId = state.pathParameters['id'] ?? '';
                return TicketScreen(ticketId: ticketId);
              },
            ),
            GoRoute(
              path: '${RouteConstants.signature}/:ticketId',
              name: RouteConstants.signatureName,
              builder: (context, state) {
                final ticketId = state.pathParameters['ticketId'] ?? '';
                return SignatureScreen(ticketId: ticketId);
              },
            ),
            GoRoute(
              path: RouteConstants.history,
              name: RouteConstants.historyName,
              builder: (context, state) => const ShiftHistoryScreen(),
            ),
            GoRoute(
              path: RouteConstants.profile,
              name: RouteConstants.profileName,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    );
  }
}

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(),
    );
  }
}

class _BottomNav extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final theme = Theme.of(context);

    int selectedIndex = 0;
    if (location.startsWith(RouteConstants.shift)) selectedIndex = 1;
    if (location.startsWith(RouteConstants.queue)) selectedIndex = 2;
    if (location.startsWith(RouteConstants.profile)) selectedIndex = 3;

    return NavigationBar(
      selectedIndex: selectedIndex,
      backgroundColor: theme.colorScheme.surface,
      indicatorColor: theme.colorScheme.primaryContainer,
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home),
          label: 'Inicio',
        ),
        NavigationDestination(
          icon: Icon(Icons.calendar_today_outlined),
          selectedIcon: Icon(Icons.calendar_today),
          label: 'Mi Turno',
        ),
        NavigationDestination(
          icon: Icon(Icons.list_outlined),
          selectedIcon: Icon(Icons.list),
          label: 'Cola',
        ),
        NavigationDestination(
          icon: Icon(Icons.person_outlined),
          selectedIcon: Icon(Icons.person),
          label: 'Perfil',
        ),
      ],
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go(RouteConstants.home);
            break;
          case 1:
            context.go(RouteConstants.shift);
            break;
          case 2:
            context.go(RouteConstants.queue);
            break;
          case 3:
            context.go(RouteConstants.profile);
            break;
        }
      },
    );
  }
}
