import { Expose } from 'class-transformer';
import { GENDER } from '../entities/gender.enum';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ProfilePayloadDto {
  @Expose()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  nickname: string;

  @Expose()
  @IsEnum(GENDER)
  gender: GENDER;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyleType, { each: true })
  travelStyles?: TravelStyleType[];

  @Expose()
  @IsOptional()
  @IsArray()
  @IsEnum(TendencyType, { each: true })
  tendency?: TendencyType[];
}
