import { Place } from '../../place/entities/place.entity';
import { RegionGroup } from '../../place/entities/region_group.enum';
import { PostInfoInReviewablePlaceDto } from './post-info-in-reviewable-place.dto';
import { Post } from '../../post/entities/post.entity';

export class ReviewablePlaceResponseDto {
  id: string;
  title: string;
  address: string;
  region: RegionGroup;
  latitude: number;
  longitude: number;
  category: string;
  image_url?: string;
  tags: string[];
  summary: string;
  sido: string;
  createdAt: Date;
  planDate?: string;
  post: PostInfoInReviewablePlaceDto;

  static fromEntity(
    place: Place,
    planDate: string,
    post: Post,
  ): ReviewablePlaceResponseDto {
    const dto = new ReviewablePlaceResponseDto();
    dto.id = place.id;
    dto.title = place.title;
    dto.address = place.address;
    dto.region = place.region;
    dto.latitude = place.latitude;
    dto.longitude = place.longitude;
    dto.category = place.category;
    dto.image_url = place.image_url;
    dto.tags = place.tags;
    dto.summary = place.summary;
    dto.sido = place.sido;
    dto.createdAt = place.createdAt;
    dto.planDate = planDate;
    dto.post = PostInfoInReviewablePlaceDto.fromEntity(post);
    return dto;
  }
}
