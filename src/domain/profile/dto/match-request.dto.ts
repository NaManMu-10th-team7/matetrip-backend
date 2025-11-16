import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';
import { KeywordType } from '../../post/entities/keywords-type.enum';

export class MatchRequestDto {
  // @IsUUID()
  // userId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional() // 쿼리나 바디에서 숫자 타입으로 넘어오더라도 문자열로 변환 후 양끝 공백을 제거한 값을 사용/검증하도록 바꿈
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim(),
  )
  @IsString()
  locationQuery?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsEnum(TravelStyleType, { each: true })
  travelStyleTypes?: TravelStyleType[];

  @IsOptional()
  // keywords는 단일 문자열 또는 여러 쿼리 파라미터로 넘어올 수 있으므로
  // 모두 배열 형태로 정규화해 enum 검증을 통과하도록 처리한다.
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    const normalized = values
      .map((keyword) => String(keyword).trim())
      .filter((keyword) => keyword.length > 0);

    return normalized.length > 0 ? normalized : undefined;
  })
  @IsArray()
  @IsEnum(KeywordType, { each: true })
  keywords?: KeywordType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayNotEmpty()
  @IsEnum(TendencyType, { each: true })
  travelTendencies?: TendencyType[];

  //유사도를 통해 얻어낼 사람 수 제한
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
