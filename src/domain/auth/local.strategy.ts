import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // 1. passport-local의 Strategy 설정을 함
    // 'usernameField 옵션으로 ID/PW 필드 이름 변경 가능. (기본값 : 'username', 'password')
    super({
      usernameField: 'email',
    });
  }

  // 2. validate 함수는 @UseGuards(AuthGuard('local'))가 호출될 때 실행
  // email과 password 값은 super() 설정에 따라 자동으로 Request.body에서 추출
  async validate(email: string, password: string): Promise<any> {
    // console.log(`[LocalStrategy] validate: ${email}, ${password}`);

    // 3. authService.validateUser를 호출해 사용자 검증
    const user = await this.authService.validateUser(email, password);

    // 4. 검증 성공 시, user 객체 반환. 이 user 객체를 `Request.user`에 저장
    return user;
  }
}
