import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ServiceUnavailableException } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { SystemPolicyService } from './system-policy.service';

/** Rotas que continuam disponíveis durante a manutenção (entrada e estado do serviço). */
const ALWAYS = [/\/health$/, /\/auth\//, /\/version$/, /\/ping$/];

/**
 * Modo de manutenção: corre depois dos guards (req.user já resolvido).
 * Administradores continuam a trabalhar; o restante efetivo recebe 503 com código MAINTENANCE.
 */
@Injectable()
export class MaintenanceInterceptor implements NestInterceptor {
  constructor(private readonly policy: SystemPolicyService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    const path: string = req.path ?? req.url ?? '';
    if (ALWAYS.some((r) => r.test(path))) return next.handle();
    return from(this.policy.maintenance()).pipe(
      switchMap((m) => {
        if (m.enabled && !req.user?.isAdmin) {
          throw new ServiceUnavailableException({ code: 'MAINTENANCE', message: m.message });
        }
        return next.handle();
      }),
    );
  }
}
