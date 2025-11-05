// src/auth/local-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // 🔥 OPTIONS 요청은 인증 없이 통과! (CORS preflight 처리)
    if (request.method === 'OPTIONS') {
      return true;
    }

    // 다른 요청은 LocalStrategy 실행 (email/password 검증)
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // 인증 실패 시
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
