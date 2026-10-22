import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE } from './auth.config';
import type { AuthUser } from './current-user.decorator';
import { TokenService } from './token.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      user?: AuthUser;
    }>();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException();

    const userId = this.tokens.verify(token);
    if (!userId) throw new UnauthorizedException();

    // Always hit the DB so blocked/deleted users lose access immediately.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === 'blocked') throw new UnauthorizedException();

    req.user = { id: user.id, role: user.role, locale: user.locale };
    return true;
  }
}
