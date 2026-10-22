import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { hashPassword, type Role } from '@fit/db';
import { normalizeEmail, type LoginInput, type RegisterInput } from '@fit/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  locale: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<{ user: SessionUser; token: string }> {
    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException({ code: 'EMAIL_TAKEN' });

    const passwordHash = await hashPassword(input.password);
    try {
      const created = await this.prisma.user.create({
        data: { email, passwordHash, locale: input.locale },
      });
      return { user: this.toSession(created), token: await this.sign(created.id) };
    } catch (e) {
      // Unique-constraint race between the check above and the insert.
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN' });
      }
      throw e;
    }
  }

  async login(input: LoginInput): Promise<{ user: SessionUser; token: string }> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS' });
    if (user.status === 'blocked') throw new ForbiddenException({ code: 'BLOCKED' });
    return { user: this.toSession(user), token: await this.sign(user.id) };
  }

  async me(id: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.status === 'blocked') throw new UnauthorizedException();
    return this.toSession(user);
  }

  private sign(userId: string): string {
    return this.tokens.sign(userId);
  }

  private toSession(u: { id: string; email: string; role: Role; locale: string }): SessionUser {
    return { id: u.id, email: u.email, role: u.role, locale: u.locale };
  }
}
