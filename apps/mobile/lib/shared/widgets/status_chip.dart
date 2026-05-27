import 'package:flutter/material.dart';

import '../../features/shifts/domain/shift_model.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.status,
    this.small = false,
  });

  final ShiftStatus status;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (color, bgColor) = _colorsForStatus(theme, status);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 8 : 12,
        vertical: small ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: small ? 6 : 8,
            height: small ? 6 : 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            status.label,
            style: TextStyle(
              color: color,
              fontSize: small ? 11 : 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  (Color, Color) _colorsForStatus(ThemeData theme, ShiftStatus status) {
    return switch (status) {
      ShiftStatus.pending => (
          const Color(0xFF6B7280),
          const Color(0xFFF3F4F6),
        ),
      ShiftStatus.confirmed => (
          theme.colorScheme.primary,
          theme.colorScheme.primaryContainer,
        ),
      ShiftStatus.inPlant || ShiftStatus.waiting => (
          const Color(0xFF0EA5E9),
          const Color(0xFFE0F2FE),
        ),
      ShiftStatus.called => (
          const Color(0xFFF4A261),
          const Color(0xFFFFF7ED),
        ),
      ShiftStatus.inProgress => (
          const Color(0xFF8B5CF6),
          const Color(0xFFF5F3FF),
        ),
      ShiftStatus.completed => (
          const Color(0xFF10B981),
          const Color(0xFFD1FAE5),
        ),
      ShiftStatus.cancelled || ShiftStatus.noShow => (
          theme.colorScheme.error,
          theme.colorScheme.errorContainer,
        ),
    };
  }
}
