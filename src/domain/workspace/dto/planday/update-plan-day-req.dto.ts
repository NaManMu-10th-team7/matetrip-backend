import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDayDto } from '../create-plan-day.dto.js';

export class UpdatePlanDayReqDto extends PartialType(CreatePlanDayDto) {}
