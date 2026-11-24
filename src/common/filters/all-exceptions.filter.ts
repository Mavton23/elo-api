import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

interface ErrorBody {
  statusCode: number;
  error: string;
  /** Código estável para a app reagir (ex.: PASSWORD_CHANGE_REQUIRED). */
  code?: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId: string;
}

/**
 * Filtro global de erros.
 *
 * - Respostas com formato único e previsível para a app.
 * - Erros do Prisma convertidos em códigos HTTP corretos (409, 404, 400).
 * - Em produção, nunca devolve stack traces nem mensagens internas ao cliente
 *   (o detalhe fica no log, ligado ao `requestId`).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    const { status, message, error } = this.resolve(exception);
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const code = raw && typeof raw === 'object' && typeof (raw as any).code === 'string' ? (raw as any).code : undefined;

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(`[${requestId}] ${req.method} ${req.originalUrl} -> ${status} (${req.ip})`);
    }

    const body: ErrorBody = {
      statusCode: status,
      error,
      ...(code ? { code } : {}),
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.setHeader('X-Request-Id', requestId);
    res.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; message: string | string[]; error: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as any).message ?? exception.message);
      return { status, message, error: HttpStatus[status] ?? 'Error' };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            message: 'Já existe um registo com estes dados.',
            error: 'CONFLICT',
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'Registo não encontrado.',
            error: 'NOT_FOUND',
          };
        case 'P2003':
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Referência inválida a outro registo.',
            error: 'BAD_REQUEST',
          };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: this.isProduction ? 'Pedido inválido.' : exception.message,
        error: 'BAD_REQUEST',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction
        ? 'Ocorreu um erro interno. Tente novamente mais tarde.'
        : exception instanceof Error
          ? exception.message
          : 'Erro interno',
      error: 'INTERNAL_SERVER_ERROR',
    };
  }
}
