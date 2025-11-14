import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { LocalAuthGuard } from './local_auth.guard';
import { JwtAuthGuard } from './jwt_auth.guard';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    // 1. UsersModule 임포트 (AuthService에서 UsersService를 주입받아야 함)
    UsersModule,
    MatchingModule,

    // 2. PassportModule 등록 (기본 전략을 'jwt'로 설정)
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // 3. JwtModule 등록 (비동기 방식)
    JwtModule.registerAsync({
      // .env 값을 사용하기 위해 ConfigService 주입
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // .env 파일에서 JWT_SECRET_KEY를 가져와서 사용
        // (이 부분은 이전에 .env 설정한 것을 활용합니다)
        const secret = config.get<string>('JWT_SECRET_KEY');

        if (!secret) {
          throw new Error(
            'JWT_SECRET_KEY is not defined in environment variables',
          );
        }
        return {
          secret,
          signOptions: {
            // 토큰 만료 시간 (예: 1시간)
            expiresIn: '1h',
          },
        };
      },
    }),
  ],

  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
  ],
  // 다른 모듈에서도 사용할 수 있게
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
