import 'package:flutter/material.dart';

enum GuayButtonVariant { primary, secondary, outlined, text }

class GuayButton extends StatelessWidget {
  const GuayButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.variant = GuayButtonVariant.primary,
    this.isLoading = false,
    this.fullWidth = true,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final GuayButtonVariant variant;
  final bool isLoading;
  final bool fullWidth;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final effectiveOnPressed = isLoading ? null : onPressed;
    final height = small ? 40.0 : 52.0;
    final minSize = Size(fullWidth ? double.infinity : 0, height);

    final loadingIndicator = SizedBox(
      width: small ? 16 : 20,
      height: small ? 16 : 20,
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: variant == GuayButtonVariant.primary
            ? theme.colorScheme.onPrimary
            : theme.colorScheme.primary,
      ),
    );

    Widget child = isLoading
        ? loadingIndicator
        : icon != null
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: small ? 16 : 18),
                  const SizedBox(width: 8),
                  Text(label),
                ],
              )
            : Text(label);

    return switch (variant) {
      GuayButtonVariant.primary => ElevatedButton(
          onPressed: effectiveOnPressed,
          style: ElevatedButton.styleFrom(minimumSize: minSize),
          child: child,
        ),
      GuayButtonVariant.secondary => ElevatedButton(
          onPressed: effectiveOnPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: theme.colorScheme.secondaryContainer,
            foregroundColor: theme.colorScheme.onSecondaryContainer,
            minimumSize: minSize,
          ),
          child: child,
        ),
      GuayButtonVariant.outlined => OutlinedButton(
          onPressed: effectiveOnPressed,
          style: OutlinedButton.styleFrom(minimumSize: minSize),
          child: child,
        ),
      GuayButtonVariant.text => TextButton(
          onPressed: effectiveOnPressed,
          child: child,
        ),
    };
  }
}
