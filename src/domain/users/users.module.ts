import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from './entities/users.entity.js';
import { PostModule } from '../post/post.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Users]), forwardRef(() => PostModule)],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
