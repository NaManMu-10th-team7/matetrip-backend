import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GENDER } from '../entities/gender.enum';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';

export class CreateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname: string;

  @IsEnum(GENDER)
  gender: GENDER;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyleType, { each: true })
  travelStyles?: TravelStyleType[];

  @IsOptional()
  @IsArray()
  @IsEnum(TendencyType, { each: true })
  tendency?: TendencyType[];
}
