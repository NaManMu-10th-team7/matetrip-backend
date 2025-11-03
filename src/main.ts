import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    origin: 'http://localhost:3001', // 프론트엔드 주소
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE', // 허용할 HTTP 메서드
    credentials: true, // 쿠키나 인증 헤더(Authorization)를 주고받을 때 필요
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
