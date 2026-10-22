import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAdmin, parseCliArgs } from '../src/create-admin';

const prisma = new PrismaClient();
const emails = ['ali-admin-test@mail.test', 'promote-admin-test@mail.test'];
const clean = () => prisma.user.deleteMany({ where: { email: { in: emails } } });

describe('createAdmin', () => {
  beforeEach(clean);
  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  it('normalizes email and creates an admin with an argon2 hash', async () => {
    const u = await createAdmin(prisma, ' Ali-Admin-Test@Mail.TEST ', 'secret123');
    expect(u.email).toBe('ali-admin-test@mail.test');
    expect(u.role).toBe('admin');
    expect(u.passwordHash).toMatch(/^\$argon2/);
  });

  it('promotes an existing user, activates them and keeps their password', async () => {
    await prisma.user.create({
      data: { email: emails[1]!, passwordHash: 'orig', status: 'blocked' },
    });
    const u = await createAdmin(prisma, ' PROMOTE-admin-test@mail.test', 'ignored');
    expect(u.role).toBe('admin');
    expect(u.status).toBe('active');
    expect(u.passwordHash).toBe('orig');
  });
});

describe('parseCliArgs', () => {
  it('parses plain args', () => {
    expect(parseCliArgs(['--email', ' A@b.c ', '--password', 'p'])).toEqual({
      email: ' A@b.c ',
      password: 'p',
    });
  });
  it('tolerates the leading "--" pnpm forwards', () => {
    expect(parseCliArgs(['--', '--email', 'a@b.c', '--password', 'p'])).toEqual({
      email: 'a@b.c',
      password: 'p',
    });
  });
});
