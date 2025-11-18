import { IsNotEmpty, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreatePlaceUserReviewDto {
  @IsUUID()
  @IsNotEmpty()
  placeId: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  content: string;
}
