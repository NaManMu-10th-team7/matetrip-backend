import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Users } from '../users/entities/users.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // 사용자 ID/PW를 검증.
  // @param email 사용자 로그인 email
  // @param password 일반 텍스트 비밀번호
  // @returns 비밀번호를 제외한 사용자 정보 또는 null
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<Users, 'hashedPassword'>> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);

    if (isMatch) {
      const { hashedPassword, ...result } = user;

      return result;
    }

    // 비밀번호가 틀리면 401 에러
    throw new UnauthorizedException('Invalid credentials');
  }

  // 검증된 사용자를 기반으로 JWT 토큰 생성
  async login(user: Omit<Users, 'hashedPassword'>) {
    // 토큰에 담길 정보 (payload)
    const payload = { email: user.email, sub: user.id };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
