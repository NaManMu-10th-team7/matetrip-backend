import { Expose } from 'class-transformer';

export class PlanDayResDto {
  @Expose()
  id: string;
  @Expose()
  dayNo: number;
  @Expose()
  planDate: string;
}
