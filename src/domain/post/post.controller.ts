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
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}
  private readonly mockUserId = '33b9b8fe-0a49-4866-8618-74a351c656ad';

  // @UseGuards(A)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto, @Req() req) {
    // const userId = req.user.id;
    // 임시 mock user의 id
    return this.postService.create(createPostDto, this.mockUserId);
  }

  @Get()
  getAll() {
    return this.postService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postService.findOne(id);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async update(@Body() updatePostDto: UpdatePostDto, @Req() req) {
    // 임시 mock user의 id
    const userId = '33b9b8fe-0a49-4866-8618-74a351c656ad';
    return this.postService.update(userId, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.postService.remove(id, this.mockUserId);
    return {
      message: '성공적으로 삭제되었습니다',
    };
  }
}
