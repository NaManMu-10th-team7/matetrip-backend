import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Req,
  HttpStatus,
  UseGuards,
  Post,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchRequestDto } from './dto/match-request.dto';
import { EmbeddingMatchingProfileDto } from './dto/embedding-matching-profile.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

type RequestWithUser = Request & { user: { id: string } };

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('search')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  searchMatches(
    @Req() req: RequestWithUser,
    @Body() matchRequestDto: MatchRequestDto,
  ) {
    return this.matchingService.findMatches(req.user.id, matchRequestDto);
  }

  @Post('profile/embedding')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async embeddingProfile(
    @Req() req: RequestWithUser,
    @Body() dto: EmbeddingMatchingProfileDto,
  ) {
    const userId = req.user?.id;
    //?? dto.userId;
    if (!userId) {
      throw new BadRequestException('userId가 필요합니다.');
    }
    return this.matchingService.embeddingMatchingProfile(userId, dto);
  }
}
