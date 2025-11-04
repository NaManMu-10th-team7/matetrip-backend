import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostParticipation } from './entities/post-participation.entity';
import { PostParticipationController } from './post-participation.controller';
import { PostParticipationService } from './post-participation.service';
import { Post } from '../post/entities/post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostParticipation, Post])],
  controllers: [PostParticipationController],
  providers: [PostParticipationService],
})
export class PostParticipationModule {}
