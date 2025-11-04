import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { PostService } from '../post/post.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { WorkspaceResponseDto } from './dto/workspace-response.dto.js';
import { Transactional } from 'typeorm-transactional';
import { PlanDay } from './entities/plan-day.entity.js';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { CreatePoiDto } from './dto/create-poi.dto.js';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly postService: PostService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
  ) {}

  @Transactional()
  async create(createWorkspaceDto: CreateWorkspaceDto) {
    /**
     * 1. postId에 맞는 workSpace가 있는지 확인
     * 2. 있으면 그에 맞는 workSpace 그대로 반환
     * 3. 없으면 새로 생성
     *
     * 생성
     * - workspace
     * - 날짜별 plan_day 객체
     */
    const { postId, workspaceName } = createWorkspaceDto;
    const postDto = await this.postService.findOne(postId);

    const existsWorkspace = await this.workspaceRepository.findOne({
      where: { post: { id: postId } },
    });

    // 이미 존재하는 workspace 어케처리할지는 미정
    if (existsWorkspace) {
      return this.toWorkspaceResponseDto(existsWorkspace);
    }

    // workspace 생성
    const workspace = this.workspaceRepository.create({
      workspaceName: workspaceName,
      post: { id: postDto.id },
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    // plan_day 생성
    const planDays: PlanDay[] = this.createPlanDays(
      savedWorkspace,
      postDto.startDate,
      postDto.endDate,
    );

    if (planDays.length > 0) {
      await this.planDayRepository.save(planDays);
    }

    // todo : resposedto 형식 바꾸기 (planday도 포함)
    return this.toWorkspaceResponseDto(savedWorkspace);
  }

  createPoi(workspaceId: string, dto: CreatePoiDto) {
    return '테스트';
  }

  findAll() {
    return `This action returns all workspace`;
  }

  async findOne(id: string) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });
    return this.toWorkspaceResponseDto(workspace);
  }

  update(id: string, updateWorkspaceDto: UpdateWorkspaceDto) {
    return `This action updates a #${id} workspace`;
  }

  remove(id: string) {
    return `This action removes a #${id} workspace`;
  }
  private toWorkspaceResponseDto(workspace: Workspace | null) {
    if (!workspace) {
      throw new NotFoundException("Workspace doesn't exist");
    }

    return plainToInstance(WorkspaceResponseDto, workspace, {
      excludeExtraneousValues: true,
    });
  }

  private createPlanDays(
    workspace: Workspace,
    startDate?: string,
    endDate?: string | null,
  ): PlanDay[] {
    if (!startDate && !endDate) return [];
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const days = eachDayOfInterval({ start, end });

    return days.map((date, i) =>
      this.planDayRepository.create({
        dayNo: i + 1,
        planDate: format(date, 'yyyy-MM-dd'),
        workspace,
      }),
    );
  }
}
