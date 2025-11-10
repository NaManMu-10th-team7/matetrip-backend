import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Post } from '../post/entities/post.entity';
import { Users } from '../users/entities/users.entity';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Workspace } from '../workspace/entities/workspace.entity';

@Module({
  imports: [
    // TypeORM 리포지토리를 DI로 사용하기 위해 forFeature 등록
    TypeOrmModule.forFeature([Review, Post, Users, Workspace]),
  ],
  providers: [ReviewService], // 서비스 프로바이더 등록
  exports: [ReviewService],
})
export class ReviewModule {}
