import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PostParticipationService } from './post-participation.service';
import { CreatePostParticipationDto } from './dto/create-post-participation.dto';
import { UpdatePostParticipationDto } from './dto/update-post-participation.dto';

@Controller('post-participation')
export class PostParticipationController {
  constructor(
    private readonly postParticipationService: PostParticipationService,
  ) {}

  @Post()
  create(@Body() createPostParticipationDto: CreatePostParticipationDto) {
    return this.postParticipationService.create(createPostParticipationDto);
  }

  @Get()
  findAll() {
    return this.postParticipationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postParticipationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePostParticipationDto: UpdatePostParticipationDto,
  ) {
    return this.postParticipationService.update(
      +id,
      updatePostParticipationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postParticipationService.remove(+id);
  }
}
