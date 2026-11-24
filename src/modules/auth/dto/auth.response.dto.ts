import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './tokens.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Access token JWT',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token para obter novo access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Tempo de expiração em segundos',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Tipo de token',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Dados do usuário autenticado',
  })
  user: AuthUserDto;
}

export class RegisterResponseDto extends AuthResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Registro realizado com sucesso',
  })
  message: string;
}