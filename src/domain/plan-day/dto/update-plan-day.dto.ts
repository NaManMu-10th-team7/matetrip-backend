import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDayDto } from './create-plan-day.dto';

export class UpdatePlanDayDto extends PartialType(CreatePlanDayDto) {}
