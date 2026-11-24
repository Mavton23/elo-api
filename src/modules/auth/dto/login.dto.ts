import { IsString, IsNotEmpty, IsOptional, ValidateIf, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.identifier)
  @Matches(/^\d{6,10}$/, { message: 'NIP inválido' })
  nip?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.identifier)
  @Matches(/^[0-9A-Z]+$/, { 
    message: 'BI deve conter apenas números e letras' 
  })
  @Length(10, 14, { message: 'BI deve ter entre 10 e 14 caracteres' })
  @Transform(({ value }) => value.toUpperCase())
  biNumber?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.identifier)
  @Matches(/^\d{9}$/, { message: 'NUIT inválido' })
  nuit?: string;

  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.identifier)
  @Matches(/@(mint|policia|prisoes|migracao)\.gov\.mz$/i, {
    message: 'Email institucional inválido',
  })
  institutionalEmail?: string;

  // Campo genérico para flexibilidade
  @IsString()
  @IsOptional()
  @ValidateIf(o => !o.nip && !o.biNumber && !o.nuit && !o.institutionalEmail)
  identifier?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  securityToken?: string; // Para 2FA
}