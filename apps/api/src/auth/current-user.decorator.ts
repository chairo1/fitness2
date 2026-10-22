import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@fit/db';

export interface AuthUser {
  id: string;
  role: Role;
  locale: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
