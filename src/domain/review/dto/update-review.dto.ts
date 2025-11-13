import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateReviewDto {
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsNotEmpty()
  content?: string;
}
