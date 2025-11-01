import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { KeywordType } from '../entities/keywords-type.enum.js';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  location: string;

  @IsOptional()
  @Matches(YMD, { message: '시작일은 YYYY-MM-DD 형식으로 입력해줘' })
  startDate?: string;

  @IsOptional()
  @Matches(YMD, { message: '시작일은 YYYY-MM-DD 형식으로 입력해줘' })
  endDate?: string;

  @IsArray()
  @IsOptional()
  @IsEnum(KeywordType, { each: true })
  keywords?: KeywordType[] = [];
}
