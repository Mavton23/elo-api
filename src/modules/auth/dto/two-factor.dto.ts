import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBase64,
  IsIn,
  IsJWT,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const MFA_METHODS = ['device', 'totp', 'otp', 'recovery', 'code'] as const;
export type MfaMethod = (typeof MFA_METHODS)[number];

export class VerifyTwoFactorLoginDto {
  @ApiProperty({ description: 'Token de desafio devolvido pelo /auth/login quando requiresTwoFactor=true' })
  @IsJWT()
  challengeToken: string;

  @ApiPropertyOptional({ enum: MFA_METHODS })
  @IsOptional() @IsIn(MFA_METHODS)
  method?: MfaMethod;

  @ApiPropertyOptional({ description: 'Código de 6 dígitos (totp/otp) ou de recuperação (XXXXX-XXXXX)' })
  @IsOptional() @IsString() @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({ description: 'Telemóvel de confiança (method=device)' })
  @IsOptional() @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Assinatura Ed25519 do desafio, em base64 (method=device)' })
  @IsOptional() @IsBase64() @MaxLength(200)
  signature?: string;
}

export class ChallengeDto {
  @ApiProperty() @IsJWT()
  challengeToken: string;
}

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos' })
  code: string;
}

export class PasswordConfirmDto {
  @ApiProperty({ description: 'Senha atual (confirmação de identidade)' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  password: string;
}

export class RegisterDeviceDto extends PasswordConfirmDto {
  @ApiProperty({ description: 'Chave pública Ed25519 (32 bytes) em base64' })
  @IsBase64() @MinLength(40) @MaxLength(60)
  publicKey: string;

  @ApiProperty({ example: 'Samsung A15' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['ios', 'android', 'web'])
  platform?: string;
}
