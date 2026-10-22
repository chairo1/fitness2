import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/auth/auth.module';
import { JwtGuard } from '../src/auth/jwt.guard';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.service';

// Test-only route; never part of the production module graph.
@Controller('test-only')
class AdminProbeController {
  @Get('admin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  admin(): { ok: true } {
    return { ok: true };
  }
}

const EMAILS = [
  'e2e-ali@mail.com',
  'e2e-blocked@mail.com',
  'e2e-roles-user@mail.com',
  'e2e-roles-admin@mail.com',
  'e2e-throttle@mail.com',
];

async function buildApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, AuthModule],
    controllers: [AdminProbeController],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

function cookieOf(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[];
  return (raw.find((c) => c.startsWith('fit_session=')) ?? '').split(';')[0] ?? '';
}

describe('auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const savedEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...savedEnv };
    app = await buildApp();
    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  });

  afterEach(async () => {
    await prisma?.user.deleteMany({ where: { email: { in: EMAILS } } });
    await app?.close();
    process.env = { ...savedEnv };
  });

  const register = (email = 'e2e-ali@mail.com', password = 'password123') =>
    request(app.getHttpServer()).post('/api/auth/register').send({ email, password });

  it('register sets an HttpOnly session cookie that authenticates /me', async () => {
    const res = await register().expect(201);
    expect(res.body).toMatchObject({ email: 'e2e-ali@mail.com', role: 'user', locale: 'az' });
    expect(res.body.passwordHash).toBeUndefined();
    const row = await prisma.user.findUnique({ where: { email: 'e2e-ali@mail.com' } });
    expect(row?.passwordHash).toContain('$m=19456,t=2,p=1$');
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(setCookie).toContain('fit_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).not.toContain('Secure');

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookieOf(res))
      .expect(200);
    expect(me.body.email).toBe('e2e-ali@mail.com');
  });

  it('marks the cookie Secure when COOKIE_SECURE=true', async () => {
    process.env.COOKIE_SECURE = 'true';
    const res = await register().expect(201);
    expect((res.headers['set-cookie'] as unknown as string[]).join(';')).toContain('Secure');
  });

  it('rejects invalid input with 400', async () => {
    await register('not-an-email', 'password123').expect(400);
    await register('e2e-ali@mail.com', 'short').expect(400);
  });

  it('treats the same email with different case/whitespace as taken (409)', async () => {
    await register('e2e-ali@mail.com').expect(201);
    const res = await register(' E2E-Ali@Mail.com ').expect(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('login works with a differently-cased email; wrong password or unknown user is 401', async () => {
    await register().expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ' E2E-ALI@mail.com', password: 'password123' })
      .expect(200);
    const bad = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-ali@mail.com', password: 'wrong-password' })
      .expect(401);
    expect(bad.body.code).toBe('INVALID_CREDENTIALS');
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-nobody@mail.com', password: 'password123' })
      .expect(401);
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('logout clears the cookie; /me without a cookie is 401', async () => {
    const res = await register().expect(201);
    const out = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookieOf(res))
      .expect(204);
    expect((out.headers['set-cookie'] as unknown as string[]).join(';')).toMatch(/fit_session=;/);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects a garbage cookie with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'fit_session=garbage')
      .expect(401);
  });

  it('blocked user: old cookie gets 401, login gets 403 BLOCKED', async () => {
    const res = await register('e2e-blocked@mail.com').expect(201);
    const cookie = cookieOf(res);
    await prisma.user.update({
      where: { email: 'e2e-blocked@mail.com' },
      data: { status: 'blocked' },
    });

    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-blocked@mail.com', password: 'password123' })
      .expect(403);
    expect(login.body.code).toBe('BLOCKED');
  });

  it('@Roles("admin"): anonymous 401, user 403, admin 200', async () => {
    await request(app.getHttpServer()).get('/api/test-only/admin').expect(401);

    const user = await register('e2e-roles-user@mail.com').expect(201);
    await request(app.getHttpServer())
      .get('/api/test-only/admin')
      .set('Cookie', cookieOf(user))
      .expect(403);

    const admin = await register('e2e-roles-admin@mail.com').expect(201);
    await prisma.user.update({
      where: { email: 'e2e-roles-admin@mail.com' },
      data: { role: 'admin' },
    });
    await request(app.getHttpServer())
      .get('/api/test-only/admin')
      .set('Cookie', cookieOf(admin))
      .expect(200);
  });

  it('fails to start without JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    await expect(buildApp()).rejects.toThrow(/JWT_SECRET/);
  });

  it('throttles register: 11th request in the window is 429 (default limit 10)', async () => {
    await app.close();
    delete process.env.THROTTLE_AUTH_LIMIT;
    delete process.env.THROTTLE_AUTH_TTL_SEC;
    app = await buildApp();
    prisma = app.get(PrismaService);

    for (let i = 0; i < 10; i++) {
      await register('e2e-throttle@mail.com').expect(i === 0 ? 201 : 409);
    }
    await register('e2e-throttle@mail.com').expect(429);
    // login has its own counter
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e-throttle@mail.com', password: 'password123' })
      .expect(200);
  });
});
