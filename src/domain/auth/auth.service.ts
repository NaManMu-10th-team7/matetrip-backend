import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserPayloadDto } from '../users/dto/user.payload.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // 사용자 ID/PW를 검증.
  // @param email 사용자 로그인 email
  // @param password 일반 텍스트 비밀번호
  // @returns 비밀번호를 제외한 사용자 정보. 실패 시 UnauthorizedException
  async validateUser(email: string, password: string): Promise<UserPayloadDto> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);

    if (isMatch) {
      return this.usersService.toUserPayloadDto(user);
    }

    // 비밀번호가 틀리면 401 에러
    throw new UnauthorizedException('Invalid credentials');
  }

  // 검증된 사용자를 기반으로 JWT 토큰 생성
  async login(user: UserPayloadDto) {
    // 토큰에 담길 정보 (payload)
    const payload = { email: user.email, sub: user.id };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  // 회원가입
  // @param createUserDto
  // @returns 생성된 사용자 정보 (비밀번호 제외)
  async signUp(createUserDto: CreateUserDto): Promise<UserPayloadDto> {
    try {
      // UserService의 create 메서드 호출. 안에서 트랜잭션, 해싱, 중복 검사 모두 일어남
      const newUser = await this.usersService.create(createUserDto);

      return newUser;
    } catch (error) {
      // UserService에서 던진 에러를 여기서 처리
      if (error instanceof ConflictException) {
        throw error;
      }

      // 그 외 모든 에러
      // 서버 로그에 에러 기록
      console.error(error);

      throw new InternalServerErrorException(
        '회원가입 처리 중 오류가 발생했습니다.',
      );
    }
  }
}
