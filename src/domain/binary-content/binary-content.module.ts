import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BinaryContent } from './entities/binary-content.entity';
import { BinaryContentService } from './binary-content.service';
import { BinaryContentController } from './binary-content.controller';
import { AwsModule } from '../../aws/aws.module';

@Module({
  imports: [TypeOrmModule.forFeature([BinaryContent]), AwsModule],
  controllers: [BinaryContentController],
  providers: [BinaryContentService],
  exports: [BinaryContentService], //ProfileModule이 이 모듈을 import해서 서비스 가져옴
})
export class BinaryContentModule {}

//대략적 설명:
//profile -> profileImageid -> BinaryContent -> s3 -> db 저장
// 따라서 s3에있는 파일들을 지워야 하기 때문에 remove 로직은 imageId랑 나머지를 분리해서 만들어야함
