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
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto.js';
import { SearchPostDto } from './dto/search-post.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}
  private readonly mockUserId = '33b9b8fe-0a49-4866-8618-74a351c656ad';

  // @UseGuards(A)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req,
  ): Promise<PostResponseDto> {
    // const userId = req.user.id;
    return this.postService.create(createPostDto, this.mockUserId);
  }

  @Get()
  getAll() {
    return this.postService.findAll();
  }

  @Get('search')
  searchPosts(@Query() searchPostDto: SearchPostDto) {
    return this.postService.searchPosts(searchPostDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PostResponseDto> {
    return this.postService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req,
  ): Promise<PostResponseDto> {
    // 임시 mock user의 id
    return this.postService.update(id, this.mockUserId, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<any> {
    await this.postService.remove(id, this.mockUserId);
    return {
      message: '성공적으로 삭제되었습니다',
    };
  }
}
