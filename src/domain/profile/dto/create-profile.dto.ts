import {
  IsArray,
  //ArrayNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';
import { GENDER } from '../entities/gender.enum';

export class CreateProfileDto {
  /*시간이나 Id db에 자동 생성 / 유저가 서버에게 보내는 내용 */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsEnum(GENDER)
  @IsNotEmpty()
  gender: GENDER;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  // @ArrayNotEmpty()
  @IsEnum(TravelStyleType, { each: true })
  travelStyles: TravelStyleType[];

  @IsArray()
  // @ArrayNotEmpty()
  @IsEnum(TendencyType, { each: true })
  tendency: TendencyType[];

  @IsOptional()
  @IsUUID()
  profileImageId?: string;
}
