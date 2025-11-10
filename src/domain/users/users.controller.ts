import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PostService } from '../post/post.service';
import { PostResponseDto } from '../post/dto/post-response.dto';
import { PostsPageQueryDto } from '../post/dto/list-posts-query.dto';
import { ProfileService } from '../profile/profile.service';
import { PostParticipationService } from '../post-participation/post-participation.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly postService: PostService,
    private readonly profileService: ProfileService,
    private readonly postParticipationService: PostParticipationService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Get(':userId/profile')
  getUserProfile(@Param('userId') userId: string) {
    return this.profileService.getProfileByUserId(userId);
  }

  @Get(':userId/posts')
  findUserPosts(
    @Param('userId') userId: string,
    @Query() listPostsQueryDto: PostsPageQueryDto,
  ): Promise<PostResponseDto[]> {
    return this.postService.findAllByUserId(userId, listPostsQueryDto);
  }

  @Get(':userId/participations')
  findUserParticipations(@Param('userId') userId: string) {
    return this.postParticipationService.findUserParticipations(userId);
  }
}
