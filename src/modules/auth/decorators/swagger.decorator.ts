import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { 
  RegisterDto, 
  LoginDto,
} from '../dto';

// Decorator para endpoint de registro
export function ApiRegister() {
  return applyDecorators(
    ApiOperation({ 
      summary: 'Registrar novo membro do Ministério',
      description: 'Cria uma nova conta com dados institucionais do Ministério do Interior' 
    }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({ 
      status: 201, 
      description: 'Registro realizado com sucesso',
    }),
    ApiResponse({ 
      status: 409, 
      description: 'Identificadores já em uso (NIP, BI, NUIT ou Email)' 
    }),
    ApiResponse({ 
      status: 400, 
      description: 'Dados inválidos ou senhas não coincidem' 
    }),
  );
}

// Decorator para endpoint de login
export function ApiLogin() {
  return applyDecorators(
    ApiOperation({ 
      summary: 'Login com múltiplos identificadores',
      description: 'Pode usar NIP, BI, NUIT ou Email institucional. O sistema identifica automaticamente.' 
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({ 
      status: 200, 
      description: 'Login realizado com sucesso',
    }),
    ApiResponse({ 
      status: 401, 
      description: 'Credenciais inválidas' 
    }),
    ApiResponse({ 
      status: 403, 
      description: 'Conta desativada ou bloqueada' 
    }),
  );
}

// Decorator para endpoints protegidos
export function ApiAuth() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({ 
      status: 401, 
      description: 'Não autorizado - Token inválido ou expirado' 
    }),
  );
}

// Aplicar tags Swagger ao controller
export function ApiAuthController() {
  return applyDecorators(
    ApiTags('Autenticação'),
    ApiResponse({ 
      status: 500, 
      description: 'Erro interno do servidor' 
    }),
  );
}