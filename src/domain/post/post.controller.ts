import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto.js';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { SearchPostDto } from './dto/search-post.dto';
import { AuthGuard } from '@nestjs/passport';
import { MatchingService } from '../profile/matching.service';
import { MatchRequestDto } from '../profile/dto/match-request.dto';

import { Request } from 'express';
@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly matchingService: MatchingService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PostResponseDto> {
    const userId = req.user.id;
    return this.postService.create(createPostDto, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAll(): Promise<PostResponseDto[]> {
    return this.postService.findAll();
  }

  @Get('search')
  searchPosts(@Query() searchPostDto: SearchPostDto) {
    return this.postService.searchPosts(searchPostDto);
  }

  @Get('user/:userId') // 엔드포인트 변경: 특정 userId의 게시글 조회
  @HttpCode(HttpStatus.OK)
  async getPostsByUserId(
    // 함수명 변경
    @Param('userId', new ParseUUIDPipe()) userId: string, // userId를 파라미터로 받음
  ): Promise<PostResponseDto[]> {
    return this.postService.findPostsByUserId(userId); // 기존 findMyPosts 함수 재활용
  }

  // @Get(':id')
  // @HttpCode(HttpStatus.OK)
  // async getOne(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  // ): Promise<PostResponseDto> {
  //   return this.postService.findOne(id);
  // }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req?: Request & { user: { id: string } },
    @Query() matchRequestDto?: MatchRequestDto,
  ): Promise<PostResponseDto> {
    const post = await this.postService.findOne(id);
    const isWriter = req?.user.id === post.writer.id;

    post.matchResult = isWriter
      ? await this.matchingService.findMatchesWithAllUsers(
          post.writer.id,
          matchRequestDto ?? {},
        )
      : null;

    return post;
  }

  // @Get(':id')
  // @HttpCode(HttpStatus.OK)
  // async getOne(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  //   @Req() req?: Request & { user?: { id: string } },
  // ): Promise<PostWithMatchesResponseDto> {
  //   const post = await this.postService.findOne(id);
  //   const requesterId = req?.user?.id;
  //   const isWriter = requesterId === post.writer.id;
  //   //작성자 일때만 매칭 정보 뜨게
  //   const matchResult = isWriter
  //     ? await this.matchingService.findMatchesWithAllUsers(post.writer.id)
  //     : null;
  //   return { post, matchResult };
  // }

  @Get('workspace/:workspaceId/members')
  @HttpCode(HttpStatus.OK)
  async getPostMembers(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
  ): Promise<UserResponseDto[]> {
    // 게시글 작성자와 승인된 참여자 목록 조회
    return this.postService.getPostMembersByWorkspaceId(workspaceId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PostResponseDto> {
    const userId = req.user.id;
    return this.postService.update(id, userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<any> {
    const userId = req.user.id;
    await this.postService.remove(id, userId);
    return {
      message: '성공적으로 삭제되었습니다',
    };
  }

  @Delete(':postId/participations/:participationId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancelParticipation(
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Param('participationId', new ParseUUIDPipe()) participationId: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<any> {
    const userId = req.user.id;
    await this.postService.cancelParticipation(postId, participationId, userId);
    return {
      message: '동행 신청이 성공적으로 취소되었습니다.',
    };
  }
}
