import { Expose } from 'class-transformer';
import { IsUUID, IsNumber, IsNotEmpty, IsString } from 'class-validator';

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
  user: SimpleUserDto;

  @Expose()
  @IsString()
  @IsNotEmpty()
  content: string;

  @Expose()
  @IsNumber()
  rating: number;

  @Expose()
  createdAt: string;
}
