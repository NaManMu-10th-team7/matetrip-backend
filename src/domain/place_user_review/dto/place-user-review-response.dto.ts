import { Expose } from 'class-transformer';
import { IsUUID, IsNumber, IsNotEmpty, IsString } from 'class-validator';
import { PlaceUserReview } from '../entities/place_user_review.entity';

class SimpleUserDto {
  @Expose()
  @IsUUID()
  userId: string;

  @Expose()
  @IsString()
  nickname: string;
}

export class PlaceUserReviewResponseDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsUUID()
  placeId: string;

  @Expose()
  user: SimpleUserDto | null;

  @Expose()
  @IsString()
  @IsNotEmpty()
  content: string;

  @Expose()
  @IsNumber()
  rating: number;

  @Expose()
  createdAt: Date;

  private constructor() {}

  static fromEntity(entity: PlaceUserReview): PlaceUserReviewResponseDto {
    const dto = new PlaceUserReviewResponseDto();
    dto.id = entity.id;
    dto.placeId = entity.place?.id;

    dto.user = entity.user
      ? {
          userId: entity.user?.id,
          nickname: entity.user?.profile?.nickname,
        }
      : null;

    dto.content = entity.content;
    dto.rating = entity.rating;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
