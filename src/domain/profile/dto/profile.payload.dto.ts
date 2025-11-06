import { Expose } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { GENDER } from '../entities/gender.enum';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';
import { MBTI_TYPES } from '../entities/mbti.enum';

export class ProfilePayloadDto {
  @Expose()
  @IsUUID()
  id: string;

  @Expose()
  @IsEmail()
  email: string; // 이메일 필드 추가

  @Expose()
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @Expose()
  @IsEnum(GENDER)
  gender: GENDER;

  @Expose()
  @IsString()
  @IsOptional()
  description: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  intro: string | null;

  @Expose()
  @IsEnum(MBTI_TYPES)
  mbtiTypes: MBTI_TYPES;

  @Expose()
  @IsArray()
  @IsEnum(TravelStyleType, { each: true })
  @IsOptional()
  travelStyles?: TravelStyleType[];

  @Expose()
  @IsArray()
  @IsEnum(TendencyType, { each: true })
  @IsOptional()
  travelTendency?: TendencyType[]; // travelTendency를 tendency로 변경

  @Expose()
  @IsUUID()
  @IsOptional()
  profileImageId?: string | null;
}
