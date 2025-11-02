import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 로그인 API Post /auth/login
  // 'local' 전략 가드 적용
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(
    @Request() req: any,
    @Body() loginDto: LoginDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(req.user);
  }
}

/**
 * 로그인 흐름
 * 1. 클라이언트가 POST /auth/login으로 email, password를 보냅니다.
 * 2. NestJS가 ValidationPipe를 실행. loginDto가 비어있으면 400 에러.
 * 3. @UseGuards(AuthGuard('local'))가 LocalStrategy를 실행합니다.
 * 4. LocalStrategy가 authService.validateUser를 호출합니다.
 * 5. authService.validateUser가 DB 조회 및 bcrypt.compare로 비번을 검증합니다.
 * 6. (실패 시) validateUser가 UnauthorizedException을 던지고, NestJS가 401 에러를 응답합니다.
 * 7. (성공 시) LocalStrategy가 user 객체를 반환하고, Passport가 이 객체를 req.user에 저장합니다.
 * 8. 드디어 AuthController의 login 메서드 본문(return this.authService.login(req.user);)이 실행됩니다.
 * 9. JWT 토큰이 생성되어 클라이언트에 응답됩니다.
 */
