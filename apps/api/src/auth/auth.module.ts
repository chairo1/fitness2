import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { getAuthThrottle } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const { limit, ttlMs } = getAuthThrottle();
        return [{ ttl: ttlMs, limit }];
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtGuard, RolesGuard],
  exports: [TokenService, JwtGuard, RolesGuard],
})
export class AuthModule {}
