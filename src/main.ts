import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './redis/redis-io.adapter.js';
import {
  initializeTransactionalContext,
  addTransactionalDataSource,
} from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { RedisService } from './redis/redis.service.js';

async function bootstrap() {
  initializeTransactionalContext();
  const app = await NestFactory.create(AppModule);
  addTransactionalDataSource(app.get(DataSource));

  app.setGlobalPrefix('api');

  const redisIoAdapter = new RedisIoAdapter(app, app.get(RedisService));
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // DTO 클래스로 자동 타입 변환
      whitelist: true, // 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 들어오면 예외 발생
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: false, // @Expose 없어도 전부 직렬화
      enableImplicitConversion: true, // 타입 자동 변환 허용
    }),
  );
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://13.125.171.175:5173',
      'http://localhost:3001'
    ], // 프론트엔드 주소
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], // 허용할 HTTP 메서드 (OPTIONS 명시)
    credentials: true, // 쿠키나 인증 헤더(Authorization)를 주고받을 때 필요
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // 허용할 헤더
    exposedHeaders: ['Set-Cookie'], // 클라이언트에서 접근 가능한 헤더
    preflightContinue: false, // preflight 요청을 자동으로 처리
    optionsSuccessStatus: 204, // OPTIONS 요청 성공 시 상태 코드
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
