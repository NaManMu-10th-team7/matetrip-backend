import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class SearchPostDto {
  @IsOptional()
  @ValidateIf((o) => o.startDate != '')
  @IsDateString({}, { message: '시작일은 YYYY-MM-DD 형식으로 입력해주세요' })
  startDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.endDate != '')
  @IsDateString({}, { message: '종료일은 YYYY-MM-DD 형식으로 입력해주세요' })
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
