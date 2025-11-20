import { Expose, Type } from 'class-transformer';
import { PoiResDto } from './poi-res.dto.js';

// todo : readonly 후 캡슐화
export class PlanDayScheduleSummaryDto {
  @Expose()
  dayNo: number;

  @Expose()
  planDate: string;
}

export class PlanDayScheduledPoisGroupDto {
  @Expose()
  @Type(() => PlanDayScheduleSummaryDto)
  planDay: PlanDayScheduleSummaryDto;

  @Expose()
  @Type(() => PoiResDto)
  pois: PoiResDto[];
}

// TODO : 분석 관련 DTO
// GET /workspace/:workspaceId/poi-analysis

// interface POIAnalysisResponse {
//   total_days: number;
//   current_poi_count: number;
//   category_distribution: Record<string, number>; // {"음식": 3, "숙박": 1, "자연": 5}
//   missing_categories: string[]; // ["숙박", "음식"]
//   recommendation_reason: string; // "2박 3일인데 숙소가 1개만..."
//   center_latitude: number;
//   center_longitude: number;
// }
