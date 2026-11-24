import { PASSWORD_MESSAGE, PASSWORD_REGEX } from './password-policy';
import { IsString, IsNotEmpty, Matches, Length, } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  // Identificação pessoal
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6,10}$/, { message: 'NIP deve ter entre 6 e 10 dígitos' })
  nip: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Z]+$/, { 
    message: 'BI deve conter apenas números e letras' 
  })
  @Length(10, 14, { message: 'BI deve ter entre 10 e 14 caracteres' })
  @Transform(({ value }) => value.toUpperCase())
  biNumber: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9}$/, { message: 'NUIT deve ter exatamente 9 dígitos' })
  nuit: string;

  // Senha
  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}