import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Workspace } from '../workspace/entities/workspace.entity';
import { PostParticipation } from '../post-participation/entities/post-participation.entity';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { ProfileModule } from '../profile/profile.module';
import { BinaryContentModule } from '../binary-content/binary-content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Users } from '../users/entities/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Workspace,
      PostParticipation,
      BinaryContent,
      Users, // Users 엔티티를 추가합니다.
    ]),
    BinaryContentModule,
    NotificationsModule,
    ProfileModule,
  ],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
