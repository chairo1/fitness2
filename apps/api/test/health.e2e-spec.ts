import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GET /api/health', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('returns 200 {status:ok, db:ok} when the database is reachable', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });

  it('returns 503 {status:error, db:down} when the database query fails', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $queryRaw: () => Promise.reject(new Error('db down')),
        $connect: () => Promise.resolve(),
        $disconnect: () => Promise.resolve(),
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/health').expect(503);
    expect(res.body).toEqual({ status: 'error', db: 'down' });
  });
});
