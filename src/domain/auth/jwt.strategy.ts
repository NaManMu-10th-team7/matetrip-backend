import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    // 1. super()를 호출하기 전에 secret 값을 먼저 가져옴
    const secret = configService.get<string>('JWT_SECRET_KEY');

    // 2. secret 값이 없는지(undefined, null, 빈 문자열) 확인
    if (!secret) {
      // 3. secret이 없으면 앱 실행 즉시 중단
      throw new Error('JWT_SECRET_KEY 환경 변수가 설정되지 않음');
    }

    // 4. secret 값이 존재함이 확인됐으므로, 안전하게 super()에 전달
    super({
      // 5. 요청의 쿠키에서 'accessToken' 토큰 추출
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.accessToken;
        },
      ]),

      // 6. 토큰 만료 시간 검사
      ignoreExpiration: false,

      // 7. AuthModule에서 설정한 비밀 키와 동일해야 함
      secretOrKey: secret,
    });
  }

  // 토큰 검증이 secretOrKey로 성공한 후 호출
  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
