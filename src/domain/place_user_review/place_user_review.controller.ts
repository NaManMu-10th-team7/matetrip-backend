import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlaceUserReviewService } from './place_user_review.service';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { PlaceUserReviewResponseDto } from './dto/place-user-review-response.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { PaginatedReviewsResponseDto } from './dto/paginated-reviews-response.dto';

@Controller('place-user-reviews')
export class PlaceUserReviewController {
  constructor(
    private readonly placeUserReviewService: PlaceUserReviewService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePlaceUserReviewDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PlaceUserReviewResponseDto> {
    return this.placeUserReviewService.create(dto, req.user.id);
  }

  @Get('place/:placeId')
  @HttpCode(HttpStatus.OK)
  async findByPlaceId(
    @Param('placeId', ParseUUIDPipe) placeId: string,
    @Query() query: GetReviewsQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    return this.placeUserReviewService.findByPlaceId(placeId, query);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async findByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetReviewsQueryDto,
  ): Promise<PaginatedReviewsResponseDto> {
    return this.placeUserReviewService.findByUserId(userId, query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':reviewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    return this.placeUserReviewService.remove(reviewId, req.user.id);
  }
}
