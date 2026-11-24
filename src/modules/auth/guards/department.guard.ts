import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Department } from '@prisma/client';

export const DEPARTMENTS_KEY = 'departments';

@Injectable()
export class DepartmentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedDepartments = this.reflector.getAllAndOverride<Department[]>(
      DEPARTMENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não há restrição de departamento, permite acesso
    if (!allowedDepartments || allowedDepartments.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar se o usuário pertence a um dos departamentos permitidos
    const hasAccess = allowedDepartments.includes(user.department as Department);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Acesso restrito ao departamento. Seu departamento: ${user.department}`,
      );
    }

    return true;
  }
}

// Decorator para departamento
export const RequiresDepartment = (...departments: Department[]) =>
  SetMetadata(DEPARTMENTS_KEY, departments);