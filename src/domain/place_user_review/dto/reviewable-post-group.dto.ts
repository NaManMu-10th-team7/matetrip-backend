import { PostInfoInReviewablePlaceDto } from './post-info-in-reviewable-place.dto';
import { ReviewablePlaceItemDto } from './reviewable-place-item.dto';

export class ReviewablePostGroupDto {
  post: PostInfoInReviewablePlaceDto;
  places: ReviewablePlaceItemDto[];
}
