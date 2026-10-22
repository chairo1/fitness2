import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // Behind Caddy: trust one proxy hop so req.ip (used for throttling) is the client IP.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(cookieParser());
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}

if (require.main === module) {
  bootstrap().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
