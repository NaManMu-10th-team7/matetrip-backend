import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // 1. S3Service가 .env 값을 읽기 위해 ConfigService를 쓰므로,
    //    ConfigModule을 꼭 임포트해야 합니다.
    ConfigModule,
  ],

  // 2. S3Service를 이 모듈의 '공급자'로 등록합니다.
  providers: [S3Service],

  // 3. S3Service를 '수출'해서,
  //    BinaryContentModule이나 ProfileModule 같은
  //    다른 모듈이 가져다 쓸 수 있게 합니다.
  exports: [S3Service],
})
export class AwsModule {}
