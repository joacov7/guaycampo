import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateTenantDto {
  @IsString() name: string;
  @IsString() slug: string;
  @IsString() cuit: string;
  @IsString() plan: string; // 'starter' | 'professional' | 'enterprise'
  @IsEmail() adminEmail: string;
  @IsString() adminName: string;
}
