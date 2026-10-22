import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './auth.config';

@Injectable()
export class TokenService {
  // Read at construction so a missing JWT_SECRET aborts app startup.
  private readonly secret = getJwtSecret();

  sign(userId: string): string {
    return jwt.sign({ sub: userId }, this.secret, { algorithm: 'HS256', expiresIn: '30d' });
  }

  /** Returns the user id, or null when the token is invalid/expired. */
  verify(token: string): string | null {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
