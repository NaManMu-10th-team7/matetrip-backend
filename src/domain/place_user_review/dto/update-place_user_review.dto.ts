import { PartialType } from '@nestjs/mapped-types';
import { CreatePlaceUserReviewDto } from './create-place_user_review.dto.js';

export class UpdatePlaceUserReviewDto extends PartialType(
  CreatePlaceUserReviewDto,
) {}
