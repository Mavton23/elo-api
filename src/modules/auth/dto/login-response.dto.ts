import { ApiProperty } from "@nestjs/swagger";
import { TokensDto } from "./tokens.dto";
import { AuthUserDto } from "./tokens.dto";
import { ContactMethod } from "@/modules/communication/services/communication.service";

export class LoginResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Login realizado com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Indica se requer autenticação de dois fatores',
    example: false,
    required: false
  })
  requiresTwoFactor?: boolean;

  @ApiProperty({
    description: 'Objeto user mapeando todos campos',
    required: false
  })
  user?: AuthUserDto;

  @ApiProperty({
    description: 'Token de desafio (curta duração) para a segunda etapa do 2FA',
    required: false
  })
  challengeToken?: string;

  @ApiProperty({ required: false, description: 'Métodos de 2FA disponíveis: device, totp, recovery, otp' })
  methods?: string[];

  @ApiProperty({ required: false, description: 'Desafio a assinar pelo telemóvel de confiança' })
  deviceNonce?: string;

  @ApiProperty({
    description: 'Tokens de autenticação (apenas se 2FA não for necessário)',
    required: false
  })
  tokens?: TokensDto;

  // Para envio de codigo OTP
  methodsUsed?: ContactMethod[];
  hint?: string;
}