import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity.js';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { Workspace } from '../workspace/entities/workspace.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostParticipation, Workspace])],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
