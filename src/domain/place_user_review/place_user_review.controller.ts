import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlaceUserReviewService } from './place_user_review.service';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { UpdatePlaceUserReviewDto } from './dto/update-place_user_review.dto';
import { PlaceUserReviewResponseDto } from './dto/place-user-review-response.dto';

@Controller('place-user-reviews')
export class PlaceUserReviewController {
  constructor(
    private readonly placeUserReviewService: PlaceUserReviewService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Body() dto: CreatePlaceUserReviewDto,
  ): Promise<PlaceUserReviewResponseDto> {
    return this.placeUserReviewService.create(dto);
  }

  @Get('place/:placeId')
  async findByPlaceId(
    @Param('placeId', ParseUUIDPipe) placeId: string,
  ): Promise<PlaceUserReviewResponseDto[]> {
    return this.placeUserReviewService.findByPlaceId(placeId);
  }

  @Get('user/:userId')
  async findByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PlaceUserReviewResponseDto[]> {
    return this.placeUserReviewService.findByUserId(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Req() req: { user: { id: string } },
  ): Promise<void> {
    return this.placeUserReviewService.remove(reviewId, req.user.id);
  }
}
