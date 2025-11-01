import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PlanDayService } from './plan-day.service';
import { CreatePlanDayDto } from './dto/create-plan-day.dto';
import { UpdatePlanDayDto } from './dto/update-plan-day.dto';

@Controller('plan-day')
export class PlanDayController {
  constructor(private readonly planDayService: PlanDayService) {}

  @Post()
  create(@Body() createPlanDayDto: CreatePlanDayDto) {
    return this.planDayService.create(createPlanDayDto);
  }

  @Get()
  findAll() {
    return this.planDayService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planDayService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDayDto: UpdatePlanDayDto) {
    return this.planDayService.update(+id, updatePlanDayDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planDayService.remove(+id);
  }
}
