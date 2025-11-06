// src/auth/jwt-auth.guard.ts (새로 생성!)
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // 🔥 OPTIONS 요청은 JWT 검증 없이 통과!
    if (request.method === 'OPTIONS') {
      return true;
    }

    // 다른 요청은 JwtStrategy 실행 (JWT 검증)
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // JWT 검증 실패 시
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
