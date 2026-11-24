import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let status = exception.getStatus ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Erro de autenticação';
    let errorCode = 'AUTH_ERROR';

    // Personalizar mensagens baseadas no tipo de erro
    if (exception.message?.includes('Credenciais inválidas')) {
      message = 'Número de identificação ou senha incorretos';
      errorCode = 'INVALID_CREDENTIALS';
      status = HttpStatus.UNAUTHORIZED;
    } else if (exception.message?.includes('Conta desativada')) {
      message = 'Sua conta está desativada. Contacte a administração.';
      errorCode = 'ACCOUNT_DISABLED';
      status = HttpStatus.FORBIDDEN;
    } else if (exception.message?.includes('Conta bloqueada')) {
      message = exception.message;
      errorCode = 'ACCOUNT_LOCKED';
      status = HttpStatus.FORBIDDEN;
    } else if (exception.message?.includes('2FA_REQUIRED')) {
      message = 'Autenticação de dois fatores necessária';
      errorCode = '2FA_REQUIRED';
      status = HttpStatus.FORBIDDEN;
    } else if (exception.message?.includes('jwt expired')) {
      message = 'Sessão expirada. Faça login novamente.';
      errorCode = 'TOKEN_EXPIRED';
      status = HttpStatus.UNAUTHORIZED;
    } else if (exception.message?.includes('jwt malformed')) {
      message = 'Token inválido';
      errorCode = 'INVALID_TOKEN';
      status = HttpStatus.UNAUTHORIZED;
    }

    response.status(status).json({
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}