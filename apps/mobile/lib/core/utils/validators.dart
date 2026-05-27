class Validators {
  Validators._();

  static String? required(String? value, {String? fieldName}) {
    if (value == null || value.trim().isEmpty) {
      return fieldName != null
          ? '$fieldName es obligatorio'
          : 'Este campo es obligatorio';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'El email es obligatorio';
    }
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Ingresá un email válido';
    }
    return null;
  }

  static String? dni(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'El DNI es obligatorio';
    }
    final dniClean = value.replaceAll('.', '').trim();
    final dniRegex = RegExp(r'^\d{7,8}$');
    if (!dniRegex.hasMatch(dniClean)) {
      return 'Ingresá un DNI válido (7 u 8 dígitos)';
    }
    return null;
  }

  static String? dniOrEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'DNI o email es obligatorio';
    }
    // If it contains @, validate as email
    if (value.contains('@')) {
      return email(value);
    }
    // Otherwise treat as DNI
    final dniClean = value.replaceAll('.', '').trim();
    final dniRegex = RegExp(r'^\d{7,8}$');
    if (!dniRegex.hasMatch(dniClean)) {
      return 'Ingresá un DNI válido o email';
    }
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'La contraseña es obligatoria';
    }
    if (value.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  }

  static String? tenantSlug(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'El nombre de empresa es obligatorio';
    }
    final slugRegex = RegExp(r'^[a-z0-9-]+$');
    if (!slugRegex.hasMatch(value.trim())) {
      return 'Solo letras minúsculas, números y guiones';
    }
    return null;
  }

  static String? combine(String? value, List<String? Function(String?)> validators) {
    for (final validator in validators) {
      final error = validator(value);
      if (error != null) return error;
    }
    return null;
  }
}
