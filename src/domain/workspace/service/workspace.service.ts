import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkspaceReqDto } from '../dto/create-workspace-req.dto';
import { PostService } from '../../post/post.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Workspace } from '../entities/workspace.entity.js';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { PlanReqDto, WorkspaceResDto } from '../dto/workspace-res.dto.js';
import { Transactional } from 'typeorm-transactional';
import { PlanDay } from '../entities/plan-day.entity.js';
import { PoiCreateReqDto } from '../dto/poi/poi-create-req.dto.js';
import { PoiCacheService } from './poi-cache.service.js';
import {
  buildToCachedPoiFromCreateDto,
  CachedPoi,
} from '../types/cached-poi.js';
import { PlanDayService } from './plan-day.service.js';
import { PoiStatus } from '../entities/poi-status.enum.js';
import { PoiService } from './poi.service.js';
import { PlanDayResDto } from '../dto/planday/plan-day-res.dto.js';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';
import { KakaoResponse } from '../types/kakao-document.js';
import { AiSearchPlaceDto } from '../../../ai/dto/ai-search-place.dto.js';
import { PlaceService } from 'src/domain/place/place.service';
import { AiService } from 'src/ai/ai.service';
import { RegionGroup } from 'src/domain/place/entities/region_group.enum';
import { differenceInCalendarDays } from 'date-fns';
import { DailyPlanResDto } from '../dto/daily-plan-recommendation-res.dto';
import { GetPlacesResDto } from 'src/domain/place/dto/get-places-res.dto';
import { AddScheduleByPlaceReqDto } from '../dto/poi/poi-add-schedule-by-place-req.dto';
import { AiScheduleBatchCreateReqDto } from '../dto/poi/ai-schedule-batch-create-req.dto';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  constructor(
    private readonly postService: PostService,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
    private readonly poiCacheService: PoiCacheService,
    private readonly poiService: PoiService,
    private readonly planDayService: PlanDayService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly placesService: PlaceService,
    private readonly aiService: AiService,
  ) {}

  @Transactional()
  async create(createWorkspaceDto: CreateWorkspaceReqDto) {
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

    if (existsWorkspace) {
      const planDayDtos: PlanDayResDto[] =
        await this.planDayService.getWorkspacePlanDays(existsWorkspace.id);

      const workspaceResDto = this.toWorkspaceResponseDto(existsWorkspace);
      return {
        planDayDtos,
        workspaceResDto,
      };
    }

    // workspace 생성
    // todo : planDayId도 넘기기
    const workspace = this.workspaceRepository.create({
      workspaceName: workspaceName,
      post: { id: postDto.id },
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // plan_day 생성
    const planDayDtos: PlanDayResDto[] =
      await this.planDayService.createPlanDays(
        savedWorkspace,
        postDto.startDate,
        postDto.endDate,
      );

    // todo : resposedto 형식 바꾸기 (planday도 포함)
    const workspaceResDto = this.toWorkspaceResponseDto(savedWorkspace);

    return {
      planDayDtos,
      workspaceResDto,
    };
  }

  async cachePoi(dto: PoiCreateReqDto): Promise<CachedPoi> {
    const cachedPoi: CachedPoi = buildToCachedPoiFromCreateDto(dto);
    await this.poiCacheService.upsertPoi(dto.workspaceId, cachedPoi);
    return cachedPoi;
  }

  async addScheduleByPlace(reqDto: AddScheduleByPlaceReqDto): Promise<void> {
    const { workspaceId, placeId, dayNo } = reqDto;

    // 1. placeId로 DB에서 장소 정보 가져오기
    const place = await this.placesService.getPlaceById(placeId);
    if (!place) {
      throw new NotFoundException(`Place with ID ${placeId} not found.`);
    }

    // 2. 가져온 정보로 "Marked" 상태의 POI를 캐시에 생성
    // 2-1. 기존에 같은 placeId로 생성된 POI가 있는지 확인 (중복 생성 방지)
    let poi = await this.poiService.getPoiByPlaceId(workspaceId, placeId);
    let poiId: string;

    if (poi) {
      poiId = poi.id;
      this.logger.debug(
        `Existing POI found for place ${placeId}. POI ID: ${poiId}`,
      );
    } else {
      // 2-2. 없으면 새로 생성
      const newPoiId = uuidv4();
      const cachedPoi: CachedPoi = {
        id: newPoiId,
        workspaceId,
        createdBy: '00000000-0000-0000-0000-000000000000',
        placeId: place.id,
        placeName: place.title,
        address: place.address,
        longitude: place.longitude,
        latitude: place.latitude,
        status: PoiStatus.MARKED,
        sequence: 0,
        isPersisted: false, // 아직 DB에 저장되지 않음
      };
      await this.poiCacheService.upsertPoi(workspaceId, cachedPoi);
      poiId = newPoiId;
      this.logger.debug(
        `New POI created for place ${placeId}. POI ID: ${poiId}`,
      );
    }

    // 3. dayNo에 맞는 planDayId 찾기
    const planDays =
      await this.planDayService.getWorkspacePlanDays(workspaceId);
    const targetPlanDay = planDays.find((pd) => pd.dayNo === dayNo);

    if (!targetPlanDay) {
      throw new NotFoundException(
        `Plan day number ${dayNo} not found in workspace ${workspaceId}.`,
      );
    }
    const planDayId = targetPlanDay.id;

    // 4. POI를 일정에 추가 (상태 변경 및 브로드캐스트)
    await this.poiService.addPoiToSchedule({
      workspaceId,
      planDayId,
      poiId,
    });

    this.logger.log(
      `Successfully added POI ${poiId} (Place: ${placeId}) to schedule for day ${dayNo} in workspace ${workspaceId}.`,
    );
  }

  /**
   * AI가 검색한 장소 목록을 받아서 POI로 변환하고 캐시에 저장합니다.
   * @param workspaceId 워크스페이스 ID
   * @param places 카카오 지도 API에서 받은 장소 데이터 배열
   * @returns 생성된 CachedPoi 배열
   */
  async markPoisFromSearch(
    workspaceId: string,
    places: AiSearchPlaceDto[],
  ): Promise<CachedPoi[]> {
    this.logger.debug(
      `Marking ${places.length} POIs from AI search in workspace ${workspaceId}`,
    );
    this.logger.debug(
      `[DEBUG] markPoisFromSearch received places:`,
      JSON.stringify(places, null, 2),
    );
    const newPois: CachedPoi[] = [];

    for (const place of places) {
      // PoiCreateReqDto를 생성하는 대신, 서버에서 직접 CachedPoi 객체를 생성합니다.
      // 이 객체는 buildCachedPoiFromCreateDto의 결과물과 동일한 구조를 가집니다.
      const newCachedPoi: CachedPoi = {
        id: uuidv4(),
        workspaceId,
        createdBy: '00000000-0000-0000-0000-000000000000', // AI Agent User ID
        placeId: place.id, // AI가 검색한 장소의 ID
        placeName: place.name,
        address: place.address,
        longitude: place.longitude,
        latitude: place.latitude,
        status: PoiStatus.MARKED,
        sequence: 0,
        isPersisted: false,
      };

      this.logger.debug(
        `[DEBUG] Creating newCachedPoi:`,
        JSON.stringify(newCachedPoi, null, 2),
      );
      await this.poiCacheService.upsertPoi(workspaceId, newCachedPoi);
      newPois.push(newCachedPoi);
    }
    this.logger.log(`Successfully marked ${newPois.length} new POIs.`);
    return newPois;
  }

  async isExist(workspaceId: string): Promise<boolean> {
    return await this.workspaceRepository.existsBy({
      id: workspaceId,
    });
  }

  async remove(id: string) {
    await this.workspaceRepository.delete(id);
  }

  async findOne(id: string) {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });
    return this.toWorkspaceResponseDto(workspace);
  }

  private toWorkspaceResponseDto(workspace: Workspace | null): WorkspaceResDto {
    if (!workspace) {
      throw new NotFoundException("Workspace doesn't exist");
    }

    return plainToInstance(WorkspaceResDto, workspace, {
      excludeExtraneousValues: true,
    });
  }

  // async cachePoiConnection(
  //   dto: CreatePoiConnectionReqDto,
  // ): Promise<CachePoiConnection> {
  //   const planDay = await this.planDayService.getPlanDayWithWorkspace(
  //     dto.planDayId,
  //   );

  //   // TODO : 바꿀 것
  //   if (dto.workspaceId !== planDay.workspace.id) {
  //     throw new BadRequestException(
  //       'Plan day does not belong to the provided workspace',
  //     );
  //   }

  //   const cachedPoiConnection: CachePoiConnection =
  //     buildCachedPoiConnection(dto);

  //   // // 일단 update도 한번에 처리
  //   // await this.poiConnectionCacheService.upsertPoiConnection(
  //   //   cachedPoiConnection,
  //   // );
  //   return cachedPoiConnection;
  // }

  // async flushConnections(workspaceId: string) {
  //   const connections: CachePoiConnection[] =
  //     await this.poiConnectionCacheService.getPoiConnections(workspaceId);

  //   if (connections.length === 0) return;

  //   const connectionToPersist = connections.filter((c) => !c.isPersisted);

  //   // todo : 이거 배치 처리하는 거 알아보기
  //   if (connectionToPersist.length > 0) {
  //     try {
  //       await Promise.all(
  //         connectionToPersist.map((connection) =>
  //           this.poiConnectionService.persistPoiConnection(connection),
  //         ),
  //       );
  //     } catch (e) {
  //       console.log('connection persist error', e);
  //       throw e;
  //     }
  //   }
  //   await this.poiConnectionCacheService.clearWorkspacePoiConnections(
  //     workspaceId,
  //   );
  // }

  async searchPlaces(query: string) {
    this.logger.log(`Searching places with query: "${query}" by AI agent.`);
    const kakaoKey = this.configService.get<string>('KAKAO_REST_API_KEY');
    const url = 'https://dapi.kakao.com/v2/local/search/keyword.json';

    try {
      const response = await lastValueFrom(
        this.httpService.get<KakaoResponse>(url, {
          headers: { Authorization: `KakaoAK ${kakaoKey}` },
          params: { query: query, size: 10 },
        }),
      );

      this.logger.log(
        `Successfully fetched ${response.data.documents.length} places from Kakao API.`,
      );

      const mappedPlaces = response.data.documents.map((place) => ({
        name: place.place_name,
        address: place.address_name,
        road_address: place.road_address_name,
        phone: place.phone,
        longitude: parseFloat(place.x),
        latitude: parseFloat(place.y),
        url: place.place_url,
        category: place.category_name,
      }));

      this.logger.debug(
        `[DEBUG] Mapped places for AI:`,
        JSON.stringify(mappedPlaces, null, 2),
      );
      return mappedPlaces;
    } catch (error: unknown) {
      this.logger.error(`Failed to call Kakao API. Query: ${query}`, error);
      if (error instanceof AxiosError) {
        this.logger.error('Kakao API Error Details:', error.response?.data);
      }
      throw new InternalServerErrorException(
        '카카오 지도 API 호출 중 오류가 발생했습니다.',
      );
    }
  }

  async createAiPlan(userId: string, planDto: PlanReqDto) {
    console.log(new Date(Date.now()));

    // 1단계 : NestJS가 직접 DB에서 성향 기반 장소 DTO 리스트를 가져옴
    const recommendedPlaces = await this.placesService.getPersonalizedPlaces({
      userId,
      region: planDto.region as RegionGroup,
    });
    console.log(new Date(Date.now()));

    if (!recommendedPlaces || recommendedPlaces.length === 0) {
      throw new Error('추천 장소를 찾을 수 없습니다.');
    }

    const sendPlaces = recommendedPlaces.map((p) => ({
      id: p.id,
      category: p.category,
      title: p.title,
      summary: p.summary,
      longitude: p.longitude,
      latitude: p.latitude,
    }));

    // 여행 총 일수 계산 (종료일 - 시작일 + 1)
    const startDate = new Date(planDto.startDate);
    const endDate = new Date(planDto.endDate);

    const daysDiff = differenceInCalendarDays(endDate, startDate);
    const totalDays = daysDiff + 1;

    // 2단계 : AI에게 장소 리스트와 날짜를 전달해 여행 계획 생성
    const aiResult = await this.aiService.generatePlan(sendPlaces, totalDays);

    console.log(new Date(Date.now()));

    if (aiResult.error) {
      throw new Error(aiResult.error);
    }

    // 3단계 : NestJS가 데이터 조립
    const finalResponse = {
      recommendations: aiResult.daily_plans.map((day) => {
        // AI가 준 ID 목록
        const pois = day.placeIDs.map((id) => {
          // 원본 DTO 리스트에서 ID로 해당 장소의 전체 정보를 찾음
          return recommendedPlaces.find((p) => p.id === id);
        });

        return { pois: pois };
      }),
    };

    console.log(new Date(Date.now()));

    // 4단계 : AI가 생성한 텍스트와 원본 장소 데이터를 함께 반환
    return finalResponse;
  }

  /**
   * 워크스페이스의 모든 참여자 성향을 종합하여 장소를 추천합니다.
   * @param workspaceId - 워크스페이스의 ID
   * @returns 추천 장소 DTO의 배열
   */
  async getConsensusRecommendations(workspaceId: string) {
    this.logger.log(
      `Fetching consensus recommendations for workspace: ${workspaceId}`,
    );

    // 1. 워크스페이스의 모든 참여자 ID를 가져옵니다.
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['post'], // 'post' 관계를 함께 로드합니다.
    });

    if (!workspace || !workspace.post) {
      throw new NotFoundException(
        `Workspace with ID ${workspaceId} or its associated post not found.`,
      );
    }

    // PostService를 통해 해당 게시글의 참여자 ID 목록을 가져옵니다.
    // PostService에 getParticipantIds와 같은 메서드가 구현되어 있어야 합니다.
    const participantUserIds = await this.postService.getParticipantIds(
      workspace.post.id,
    );

    if (!participantUserIds || participantUserIds.length === 0) {
      this.logger.warn(`No participants found for workspace: ${workspaceId}`);
      return [];
    }

    // 2. PlaceService에 사용자 ID 목록을 전달하여 종합 추천 장소를 요청합니다.
    const placeList = await this.placesService.getConsensusRecommendedPlaces(
      participantUserIds,
      workspace.post.location as RegionGroup,
    );

    // placeList에서 임의로 5개 장소를 선택합니다.
    const shuffled = [...placeList].sort(() => 0.5 - Math.random());
    const selectedPlaces = shuffled.slice(0, 5);

    return selectedPlaces;
  }

  /**
   * @description 워크스페이스에 연결된 게시글 정보를 조회합니다.
   * @param workspaceId - 워크스페이스의 ID
   * @returns 게시글 정보 DTO
   */
  async getPostByWorkspaceId(workspaceId: string) {
    this.logger.log(`Fetching post info for workspace: ${workspaceId}`);

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['post'], // 'post' 관계를 함께 로드합니다.
    });

    if (!workspace || !workspace.post) {
      throw new NotFoundException(
        `Workspace with ID ${workspaceId} or its associated post not found.`,
      );
    }

    // PostService의 findOne을 사용하여 PostResDto로 변환하여 반환합니다.
    return this.postService.findOne(workspace.post.id);
  }

  /**
   * @description 워크스페이스 참여자 모두의 성향을 종합하여 숙소를 추천합니다.
   * @param planDto - 여행 기간 및 지역 정보
   * @returns 추천 숙소 DTO 배열
   */
  async getConsensusRecommendedAccommodations(
    planDto: PlanReqDto,
  ): Promise<DailyPlanResDto[]> {
    this.logger.log(
      `Fetching consensus recommended accommodations for workspace: ${planDto.workspaceId}`,
    );

    // 1. 총 여행 일수 계산
    const startDate = new Date(planDto.startDate);
    const endDate = new Date(planDto.endDate);
    const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

    if (totalDays <= 0) {
      return [];
    }

    // 2. 워크스페이스 참여자 ID 및 지역 정보 조회
    const workspace = await this.workspaceRepository.findOne({
      where: { id: planDto.workspaceId },
      relations: ['post'],
    });

    if (!workspace || !workspace.post) {
      throw new NotFoundException(
        `Workspace with ID ${planDto.workspaceId} or its associated post not found.`,
      );
    }

    const participantUserIds = await this.postService.getParticipantIds(
      workspace.post.id,
    );

    // 3. PlaceService를 통해 그룹의 종합 성향 벡터를 계산합니다.
    const avgVector =
      await this.placesService.calculateConsensusVector(participantUserIds);

    if (!avgVector) {
      return [];
    }

    // 4. 노이즈를 추가한 벡터로 숙소를 추천받습니다.
    const noisyVectorForAccommodations = this.addNoiseToVector(avgVector);
    const accommodations =
      await this.placesService.getConsensusRecommendedAccommodations(
        noisyVectorForAccommodations,
        planDto.region as RegionGroup,
        totalDays, // 여행 일수만큼 숙소 추천
      );

    if (accommodations.length === 0) {
      return [];
    }

    // 5. 각 숙소에 대해 다른 장소들을 추천받아 일일 계획 생성
    const dailyPlans: DailyPlanResDto[] = [];
    const recommendedPlaceIds = new Set<string>(
      accommodations.map((acc) => acc.id),
    );

    // '음식', '숙박'을 제외한 추천 가능 카테고리 목록
    const baseAvailableCategories = ['인문(문화/예술/역사)', '레포츠', '자연'];

    for (const accommodation of accommodations) {
      const interleavedPlaces: GetPlacesResDto[] = [];

      // 1. 필요한 장소들을 한 번에 요청 (음식 2, 기타 4)
      const categoriesToRecommend = new Map<string, number>([
        ['음식', 2],
        ...baseAvailableCategories.map((cat) => [cat, 4] as [string, number]), // 각 카테고리에서 충분히 가져오기
      ]);

      // 추천에 다양성을 주기 위해 노이즈 추가
      const noisyVectorForPois = this.addNoiseToVector(avgVector);

      const placesForDay =
        await this.placesService.getConsensusRecommendedPlacesForCategories(
          noisyVectorForPois,
          planDto.region as RegionGroup,
          categoriesToRecommend,
          Array.from(recommendedPlaceIds),
          accommodation.latitude,
          accommodation.longitude,
        );

      // 2. 가져온 장소들을 카테고리별로 분류
      const foodPlaces = placesForDay.filter((p) => p.category === '음식');
      const otherPlaces = placesForDay.filter((p) => p.category !== '음식');

      // 3. [장소, 장소, 음식] 순서로 2번 조합
      for (let i = 0; i < 2; i++) {
        if (otherPlaces[i * 2]) interleavedPlaces.push(otherPlaces[i * 2]);
        if (otherPlaces[i * 2 + 1])
          interleavedPlaces.push(otherPlaces[i * 2 + 1]);
        if (foodPlaces[i]) interleavedPlaces.push(foodPlaces[i]);
      }

      // 4. 추천된 장소 ID들을 Set에 추가하여 다음 날 추천에서 제외
      interleavedPlaces.forEach((p) => recommendedPlaceIds.add(p.id));

      // 5. 마지막에 숙소를 추가
      interleavedPlaces.push(accommodation);

      dailyPlans.push({ pois: interleavedPlaces });
    }

    return dailyPlans;
  }

  /**
   * @description 임베딩 벡터에 약간의 노이즈를 추가하여 추천 결과에 다양성을 부여합니다.
   * @param vector 원본 임베딩 벡터
   * @param noiseLevel 노이즈의 강도 (표준편차)
   * @returns 노이즈가 추가된 새로운 벡터
   */
  private addNoiseToVector(vector: number[], noiseLevel = 0.05): number[] {
    return vector.map(
      (value) => value + (Math.random() - 0.5) * 2 * noiseLevel,
    );
  }

  /**
   * @description 워크스페이스의 모든 POI와 일정을 삭제합니다 (Redis + DB).
   * AI가 새로운 여행 코스를 생성하기 전에 호출됩니다.
   * @param workspaceId - 워크스페이스 ID
   */
  async clearAllPois(workspaceId: string): Promise<void> {
    this.logger.log(`Clearing all POIs for workspace ${workspaceId}`);

    // 1. planDayIds 조회
    const planDayIds =
      await this.planDayService.getWorkspacePlanDayIds(workspaceId);

    if (planDayIds.length === 0) {
      this.logger.warn(`No plan days found for workspace ${workspaceId}`);
      return;
    }

    // 2. Redis 캐시 삭제
    await this.poiCacheService.clearWorkspacePois(workspaceId, planDayIds);

    // 3. DB에서 POI 삭제
    await this.poiService.deleteAllPoisByPlanDays(planDayIds);

    this.logger.log(
      `Successfully cleared all POIs for workspace ${workspaceId}`,
    );
  }

  /**
   * @description AI 에이전트가 생성한 여행 코스를 일괄로 POI 일정에 추가합니다.
   * @param workspaceId - 워크스페이스 ID
   * @param data - AI가 생성한 장소 목록 및 경유지 목록
   * @returns 생성된 CachedPoi 배열
   */
  async createAiScheduleBatch(
    workspaceId: string,
    data: AiScheduleBatchCreateReqDto,
  ): Promise<CachedPoi[]> {
    this.logger.log(
      `Creating AI schedule batch for workspace ${workspaceId}: ${data.places.length} places`,
    );

    const createdPois: CachedPoi[] = [];
    const AI_USER_ID = '00000000-0000-0000-0000-000000000000';

    // 워크스페이스의 PlanDay 목록 조회 (dayNo로 정렬)
    const planDays =
      await this.planDayService.getWorkspacePlanDays(workspaceId);
    const dayNoToPlanDayId = new Map<number, string>();
    for (const planDay of planDays) {
      dayNoToPlanDayId.set(planDay.dayNo, planDay.id);
    }

    // 장소(Place) 처리 - waypoints는 무시하고 places만 사용
    for (const place of data.places) {
      const planDayId = dayNoToPlanDayId.get(place.day);
      if (!planDayId) {
        this.logger.warn(
          `PlanDay not found for place '${place.placeName}' on day ${place.day}. Creating as MARKED.`,
        );
      }

      const newCachedPoi: CachedPoi = {
        id: uuidv4(),
        workspaceId,
        createdBy: AI_USER_ID,
        placeId: place.placeId,
        placeName: place.placeName,
        address: place.address,
        longitude: place.longitude,
        latitude: place.latitude,
        status: planDayId ? PoiStatus.SCHEDULED : PoiStatus.MARKED,
        planDayId: planDayId || undefined,
        sequence: place.sequence ?? 0,
        isPersisted: false,
      };

      await this.poiCacheService.upsertPoi(workspaceId, newCachedPoi);

      // SCHEDULED 상태인 경우 스케줄 리스트에도 추가
      if (
        newCachedPoi.planDayId &&
        newCachedPoi.status === PoiStatus.SCHEDULED
      ) {
        await this.poiCacheService.addToSchedule(
          workspaceId,
          newCachedPoi.planDayId,
          newCachedPoi.id,
        );
      }

      createdPois.push(newCachedPoi);
    }

    this.logger.log(
      `Successfully created ${createdPois.length} items for workspace ${workspaceId}`,
    );

    return createdPois;
  }
}
