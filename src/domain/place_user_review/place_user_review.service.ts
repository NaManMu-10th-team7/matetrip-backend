import { Injectable } from '@nestjs/common';
import { CreatePlaceUserReviewDto } from './dto/create-place_user_review.dto';
import { UpdatePlaceUserReviewDto } from './dto/update-place_user_review.dto';

@Injectable()
export class PlaceUserReviewService {
  create(createPlaceUserReviewDto: CreatePlaceUserReviewDto) {
    return 'This action adds a new placeUserReview';
  }

  findByPlaceId(placeId: string) {
    return `This action returns a #${id} placeUserReview`;
  }

  remove(id: string) {
    return `This action removes a #${id} placeUserReview`;
  }
}
