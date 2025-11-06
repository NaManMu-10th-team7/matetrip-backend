import { Injectable, NotFoundException } from '@nestjs/common';
import { Workspace } from '../entities/workspace.entity.js';
import { PlanDay } from '../entities/plan-day.entity.js';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanDayResDto } from '../dto/planday/plan-day-res.dto.js';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PlanDayService {
  constructor(
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
  ) {}

  async createPlanDays(
    workspace: Workspace,
    startDate?: string,
    endDate?: string | null,
  ): Promise<PlanDayResDto[]> {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const days = eachDayOfInterval({ start, end });
    const plandays: PlanDay[] = days.map((date, i) =>
      this.planDayRepository.create({
        dayNo: i + 1,
        planDate: format(date, 'yyyy-MM-dd'),
        workspace: { id: workspace.id } as Workspace,
      }),
    );
    await this.planDayRepository.insert(plandays);

    return plandays.map((planday) => this.toPlanDayResDto(planday));
  }

  async getWorkspacePlanDays(workspaceId: string): Promise<PlanDayResDto[]> {
    const planDays: PlanDay[] = await this.planDayRepository.find({
      where: {
        workspace: {
          id: workspaceId,
        } as Workspace,
      },
    });

    return planDays.map((planDay) => this.toPlanDayResDto(planDay));
  }

  async getWorkspacePlanDayIds(workSpaceId: string): Promise<string[]> {
    const planDays = await this.getWorkspacePlanDays(workSpaceId);
    return planDays.map((planDay) => planDay.id);
  }

  async getPlanDayWithWorkspace(planDayId: string): Promise<PlanDay> {
    const planDay = await this.planDayRepository.findOne({
      where: { id: planDayId },
      relations: ['workspace'],
    });

    if (!planDay) {
      throw new NotFoundException(`PlanDay with id ${planDayId} not found`);
    }

    return planDay;
  }

  private toPlanDayResDto(planDay: PlanDay): PlanDayResDto {
    if (!planDay) {
      throw new NotFoundException("PlanDay doesn't exist");
    }

    return plainToInstance(PlanDayResDto, planDay, {
      excludeExtraneousValues: true,
    });
  }
}
