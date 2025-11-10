import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity.js';
import { Profile } from '../profile/entities/profile.entity';
import { PostModule } from '../post/post.module.js';
import { ProfileModule } from '../profile/profile.module';
import { PostParticipationModule } from '../post-participation/post-participation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, Profile]),
    forwardRef(() => PostModule),
    ProfileModule,
    PostParticipationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],

  // 다른 모듈(AuthModule)에서 사용하기 위해 export
  exports: [UsersService],
})
export class UsersModule {}
