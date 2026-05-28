import { IsString, IsOptional } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
