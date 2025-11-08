import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';

export class MatchRequestDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsEnum(TravelStyleType, { each: true })
  travelTendencyTypes?: TravelStyleType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsEnum(TendencyType, { each: true })
  travelTendencies?: TendencyType[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
