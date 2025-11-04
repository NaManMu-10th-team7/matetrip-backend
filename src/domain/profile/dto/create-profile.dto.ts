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
import { MBTI_TYPES } from '../entities/mbti.enum';

export class CreateProfileDto {
  /*시간이나 Id db에 자동 생성 / 유저가 서버에게 보내는 내용 */
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsEnum(GENDER)
  @IsNotEmpty()
  gender: GENDER;

  @IsOptional()
  @IsString()
  intro: string = '';

  @IsOptional()
  @IsString()
  description: string = '';

  @IsArray()
  // @ArrayNotEmpty()
  @IsEnum(TravelStyleType, { each: true })
  travelStyles?: TravelStyleType[];

  @IsArray()
  @IsEnum(TendencyType, { each: true })
  @IsOptional()
  tendency?: TendencyType[];

  @IsEnum(MBTI_TYPES)
  mbtiTypes: MBTI_TYPES;

  @IsOptional()
  @IsUUID()
  profileImageId?: string | null; //제거가 안됨(create이니까)
}
