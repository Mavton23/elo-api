import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ActivityLevel, ActivityModule } from '@prisma/client';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '@/modules/prisma/prisma.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Rotas que não devem gerar auditoria (ruído ou dados sensíveis). */
const SKIP = [/\/auth\/(login|refresh|verify-2fa-login|check-)/, /\/health$/];

function moduleFor(path: string): ActivityModule {
  if (path.includes('/admin/hierarchy') || path.includes('/hierarchy')) return ActivityModule.HIERARCHY;
  if (path.includes('/admin/users') || path.includes('/admin/add-member') || path.includes('/life-proof') || path.includes('/data-updates')) return ActivityModule.USERS;
  if (path.includes('/admin')) return ActivityModule.ADMIN;
  if (path.includes('/notifications')) return ActivityModule.NOTIFICATIONS;
  if (path.includes('/auth')) return ActivityModule.AUTH;
  return ActivityModule.SYSTEM;
}

/**
 * Trilha de auditoria: regista QUEM (utilizador autenticado), O QUÊ (método +
 * rota), QUANDO, DE ONDE (IP/user-agent) e o RESULTADO de cada operação de
 * escrita. Nunca regista o corpo do pedido (pode conter senhas ou conteúdo
 * classificado). Falhas de escrita no log nunca bloqueiam o pedido.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: any }>();
    const path = req.originalUrl.split('?')[0];
    if (!MUTATING.has(req.method) || SKIP.some((r) => r.test(path))) {
      return next.handle();
    }

    const write = (status: number, failed: boolean) => {
      const user = req.user;
      if (!user?.id) return; // pedidos anónimos já são tratados pelo rate-limit
      const isAdminArea = path.includes('/admin');
      const level: ActivityLevel = failed
        ? status === 401 || status === 403
          ? ActivityLevel.SECURITY
          : ActivityLevel.WARNING
        : isAdminArea
          ? ActivityLevel.SECURITY
          : ActivityLevel.INFO;

      this.prisma.activityLog
        .create({
          data: {
            level,
            module: moduleFor(path),
            action: `${req.method} ${context.getClass().name}.${context.getHandler().name}`.slice(0, 200),
            description: `${req.method} ${path} -> ${status}`,
            userId: user.id,
            userName: user.fullName?.slice(0, 200),
            userRole: (user.adminLevel ?? user.memberRank ?? '').slice(0, 50) || null,
            targetId: (req.params as any)?.id ?? (req.params as any)?.userId ?? null,
            ipAddress: (req.ip ?? '').slice(0, 45) || null,
            userAgent: (req.headers['user-agent'] as string | undefined)?.slice(0, 500) ?? null,
          },
        })
        .catch((e) => this.logger.error('Falha ao gravar auditoria', e));
    };

    return next.handle().pipe(
      tap({
        next: () => write(context.switchToHttp().getResponse().statusCode, false),
        error: (err) => write(err?.status ?? 500, true),
      }),
    );
  }
}
