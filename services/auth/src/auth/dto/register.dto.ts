import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: 'juan@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+5493411234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase, one lowercase, and one number',
  })
  password!: string;

  @ApiProperty({ example: 'tenant-slug' })
  @IsString()
  tenantSlug!: string;
}
