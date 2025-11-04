import {
  Controller,
  HttpCode,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PostParticipationService } from './post-participation.service';
import { PostParticipationResponseDto } from './dto/post-participation-response.dto';

@Controller('posts/:postId/participations')
export class PostParticipationController {
  constructor(
    private readonly postParticipationService: PostParticipationService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async requestParticipation(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PostParticipationResponseDto> {
    const requesterId = req.user.id;
    return this.postParticipationService.requestParticipation(
      postId,
      requesterId,
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getParticipationsForPost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<PostParticipationResponseDto[]> {
    return this.postParticipationService.getParticipationsForPost(postId);
  }
}
