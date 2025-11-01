import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { KeywordType } from '../entities/keywords-type.enum.js';

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
  @IsDateString({}, { message: '시작일은 YYYY-MM-DD 형식으로 입력해주세요' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: '종료일은 YYYY-MM-DD 형식으로 입력해주세요' })
  endDate?: string;

  @IsArray()
  @IsOptional()
  @IsEnum(KeywordType, { each: true })
  keywords?: KeywordType[] = [];
}
