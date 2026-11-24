import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PrismaUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);