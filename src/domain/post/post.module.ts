import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { Workspace } from '../workspace/entities/workspace.entity';
import { BinaryContentModule } from '../binary-content/binary-content.module';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostParticipation,
      Workspace,
      BinaryContent,
    ]),
    BinaryContentModule,
    ProfileModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
