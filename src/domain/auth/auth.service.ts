import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { NovaService } from '../../ai/summaryLLM.service';
import { MatchingService } from '../profile/matching.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserPayloadDto } from '../users/dto/user.payload.dto';
import { buildEmbeddingPayloadFromSource } from '../profile/utils/embedding-payload.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly novaService: NovaService,
    private readonly matchingService: MatchingService,
    private readonly jwtService: JwtService,
  ) {}

  // 사용자 ID/PW를 검증.
  // @param email 사용자 로그인 email
  // @param password 일반 텍스트 비밀번호
  // @returns 비밀번호를 제외한 사용자 정보. 실패 시 UnauthorizedException
  async validateUser(email: string, password: string): Promise<UserPayloadDto> {
    const user = await this.usersService.findByEmail(email);

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
  async login(user: UserPayloadDto): Promise<string> {
    // 토큰에 담길 정보 (payload)
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload);

    return accessToken;
  }

  // 회원가입
  // @param createUserDto
  // @returns 생성된 사용자 정보 (비밀번호 제외)
  async signUp(createUserDto: CreateUserDto): Promise<UserPayloadDto> {
    try {
      const profile = createUserDto.profile;
      if (profile?.description?.trim()) {
        const rawDesc = profile.description?.trim();

        if (rawDesc) {
          const isMeaningful =
            await this.novaService.isMeaningfulSummaryLLM(rawDesc);
          if (!isMeaningful) {
            throw new BadRequestException(
              '상세소개 요약이 부적절하거나 의미가 없어 회원가입을 진행할 수 없습니다.',
            );
          }
        }
      }
      // UserService의 create 메서드 호출. 안에서 트랜잭션, 해싱, 중복 검사 모두 일어남
      const newUser = await this.usersService.create(createUserDto);

      //임베딩 처리(임베딩 dto 대로 보냄)
      const embeddingPayload = buildEmbeddingPayloadFromSource(
        createUserDto.profile,
      );
      await this.matchingService.embeddingMatchingProfile(
        newUser.id,
        embeddingPayload,
      );

      return newUser;
    } catch (error) {
      // UserService에서 던진 에러를 여기서 처리
      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
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
