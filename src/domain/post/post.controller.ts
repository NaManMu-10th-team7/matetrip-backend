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
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // @UseGuards(A)
  @Post()
  create(@Body() createPostDto: CreatePostDto, @Req() req) {
    // const userId = req.user.id;
    // 임시 mock user의 id
    const userId = '33b9b8fe-0a49-4866-8618-74a351c656ad';

    return this.postService.create(createPostDto, userId);
  }

  @Get()
  getAll() {
    return this.postService.findAll();
  }

  @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postService.findOne(id);
  }

  @Patch()
  update(@Body() updatePostDto: UpdatePostDto, @Req() req) {
    // 임시 mock user의 id
    const userId = '33b9b8fe-0a49-4866-8618-74a351c656ad';
    return this.postService.update(userId, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(+id);
  }
}
