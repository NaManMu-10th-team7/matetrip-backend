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
import { SearchPostDto } from './dto/search-post.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

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
  async getPostsByUserId( // 함수명 변경
    @Param('userId', new ParseUUIDPipe()) userId: string, // userId를 파라미터로 받음
  ): Promise<PostResponseDto[]> {
    return this.postService.findMyPosts(userId); // 기존 findMyPosts 함수 재활용
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PostResponseDto> {
    return this.postService.findOne(id);
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
