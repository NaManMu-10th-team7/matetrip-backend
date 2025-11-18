import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlaceUserReviewService } from './place_user_review.service';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { UpdatePlaceUserReviewDto } from './dto/update-place_user_review.dto';

@Controller('place-user-review')
export class PlaceUserReviewController {
  constructor(
    private readonly placeUserReviewService: PlaceUserReviewService,
  ) {}

  @Post()
  create(@Body() dto: CreatePlaceUserReviewDto) {
    return this.placeUserReviewService.create(dto);
  }

  @Get()
  findAll() {
    return this.placeUserReviewService.findAll();
  }

  @Get(':placeId')
  getAllByPlaceId(@Param('placeId') placeId: string) {
    return this.placeUserReviewService.findByPlaceId(placeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlaceUserReviewDto: UpdatePlaceUserReviewDto,
  ) {
    return this.placeUserReviewService.update(+id, updatePlaceUserReviewDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placeUserReviewService.remove(+id);
  }
}
