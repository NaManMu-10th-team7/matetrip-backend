import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { KeywordType } from '../entities/keywords-type.enum.js';

export class CreatePostDto {
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  location: string;

  @IsOptional()
  @IsInt()
  @Min(2, { message: '최대 참여 인원은 2명 이상이어야 합니다.' })
  maxParticipants?: number;

  @IsOptional()
  @IsDateString({}, { message: '시작일은 YYYY-MM-DD 형식으로 입력해주세요' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '종료일은 YYYY-MM-DD 형식으로 입력해주세요' })
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(KeywordType, { each: true })
  keywords?: KeywordType[];
}
