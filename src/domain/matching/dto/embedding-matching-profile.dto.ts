import {
  // ArrayNotEmpty,
  // ArrayUnique,
  // IsArray,
  // IsEnum,
  // IsOptional,
  IsString,
  // IsUUID,
} from 'class-validator';
// import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
// import { TendencyType } from '../../profile/entities/tendency-type.enum';

export class EmbeddingMatchingProfileDto {
  // @IsUUID()
  // userId: string;

  @IsString()
  description: string;

  // @IsOptional()
  // @IsArray()
  // @ArrayUnique()
  // @ArrayNotEmpty()
  // @IsEnum(TravelStyleType, { each: true })
  // travelTendencyTypes?: TravelStyleType[];

  // @IsOptional()
  // @IsArray()
  // @ArrayUnique()
  // @ArrayNotEmpty()
  // @IsEnum(TendencyType, { each: true })
  // travelTendencies?: TendencyType[];
}
