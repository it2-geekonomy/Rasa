import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url?: string;
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();

    const method = (req.method || 'GET').toUpperCase();
    const raw = req.originalUrl || req.url || '';
    const path = raw.split('?')[0].replace(/^\/api/, '') || '/';

    // Public endpoints (health, root, login)
    if (
      path === '' ||
      path === '/' ||
      path.startsWith('/health') ||
      path.startsWith('/auth/login')
    ) {
      return true;
    }

    const header = req.headers.authorization || req.headers.Authorization;
    if (!header?.trim()) {
      throw new UnauthorizedException(
        'Unauthorized. Send an Authorization header as: Bearer <access_token>.',
      );
    }

    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1].trim()) {
      throw new UnauthorizedException('Unauthorized. Use Bearer authentication.');
    }

    const token = match[1].trim();
    const secret = process.env.AUTH_JWT_SECRET ?? 'rasa-fest-secret-key-change-in-production-2026';

    try {
      const decoded = jwt.verify(token, secret);
      req.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized. Token is invalid or expired.');
    }
  }
}
