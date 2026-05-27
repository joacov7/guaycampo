'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RoleSelector } from './role-selector';
import { UserStatus } from '@guaycampo/shared-types';
import { cn } from '@/lib/utils';

const userSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  roleName: z.string().min(1, 'Seleccioná un rol'),
  status: z.nativeEnum(UserStatus),
});

export type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormValues>;
  onSubmit: (values: UserFormValues) => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

export function UserForm({ defaultValues, onSubmit, isLoading, isEditMode }: UserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      status: UserStatus.ACTIVE,
      ...defaultValues,
    },
  });

  const selectedRole = watch('roleName') ?? '';
  const selectedStatus = watch('status');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nombre completo *</Label>
          <Input
            id="fullName"
            placeholder="Ej: Juan Pérez"
            {...register('fullName')}
            className={errors.fullName ? 'border-red-400' : ''}
          />
          {errors.fullName && (
            <p className="text-xs text-red-600">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@ejemplo.com"
            {...register('email')}
            disabled={isEditMode}
            className={cn(errors.email ? 'border-red-400' : '', isEditMode ? 'bg-gray-50' : '')}
          />
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
          {isEditMode && (
            <p className="text-xs text-gray-400">El email no se puede cambiar</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            {...register('phone')}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Estado</Label>
          <div className="flex gap-3">
            {([UserStatus.ACTIVE, UserStatus.INACTIVE] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setValue('status', s)}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  selectedStatus === s
                    ? s === UserStatus.ACTIVE
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300',
                )}
              >
                {s === UserStatus.ACTIVE ? 'Activo' : 'Inactivo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Role selector */}
      <div className="space-y-2">
        <Label>Rol *</Label>
        <RoleSelector
          value={selectedRole}
          onChange={(v) => setValue('roleName', v)}
          error={errors.roleName?.message}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 bg-guay-600 hover:bg-guay-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}
