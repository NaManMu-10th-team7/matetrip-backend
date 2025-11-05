import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Post } from '../post/entities/post.entity';
import { Users } from '../users/entities/users.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [
    // TypeORM 리포지토리를 DI로 사용하기 위해 forFeature 등록
    TypeOrmModule.forFeature([Review, Post, Users]),
  ],
  providers: [ReviewService], // 서비스 프로바이더 등록
  controllers: [ReviewController], // 라우팅 담당 컨트롤러 등록
})
export class ReviewModule {}
