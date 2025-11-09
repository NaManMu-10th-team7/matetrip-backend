import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MatchRequestDto } from './dto/match-request.dto';
import {
  MatchCandidateDto,
  MatchRecruitingPostDto,
  MatchResponseDto,
} from './dto/match-response.dto';
import { Profile } from '../profile/entities/profile.entity';
import { TravelStyleType } from '../profile/entities/travel-style-type.enum';
import { TendencyType } from '../profile/entities/tendency-type.enum';
import { Post } from '../post/entities/post.entity';
import { PostStatus } from '../post/entities/post-status.enum';
import { MBTI_TYPES } from '../profile/entities/mbti.enum';
import { EmbeddingMatchingProfileDto } from './dto/embedding-matching-profile.dto';
import { NovaService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';

interface RawMatchRow {
  userId: string;
  travelStyles: TravelStyleType[] | null;
  travelTendencies: TendencyType[] | null;
  vectorDistance: number | null;
  mbti: MBTI_TYPES | null;
}

const DEFAULT_LIMIT = 20;
const VECTOR_WEIGHT = 0.3;
const STYLE_WEIGHT = 0.25;
const MBTI_WEIGHT = 0.25;
const TENDENCY_WEIGHT = 0.2;

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MatchingProfile)
    private readonly matchingProfileRepository: Repository<MatchingProfile>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly novaService: NovaService,
    private readonly titanEmbeddingService: TitanEmbeddingService,
  ) {}

  async findMatches(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchResponseDto> {
    const requesterProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!requesterProfile) {
      throw new NotFoundException('요청한 사용자의 프로필을 찾을 수 없습니다.');
    }

    const requesterMatchingProfile =
      await this.matchingProfileRepository.findOne({
        where: { user: { id: userId } },
        relations: { user: true },
      });

    if (
      !requesterMatchingProfile ||
      !requesterMatchingProfile.profileEmbedding
    ) {
      throw new BadRequestException(
        '요청한 사용자의 임베딩 정보가 아직 준비되지 않았습니다.',
      );
    }
    //MatchRequestDto에서 보낸게 없으면 profile 데이터에서 찾아옴 =baseTravelStyles,baseTravelTendencies
    const baseTravelStyles = requesterProfile.travelStyles ?? [];
    const baseTravelTendencies = requesterProfile.travelTendency ?? [];

    const filterTravelStyles =
      matchRequestDto.travelTendencyTypes?.length &&
      matchRequestDto.travelTendencyTypes.length > 0
        ? matchRequestDto.travelTendencyTypes
        : baseTravelStyles;

    const filterTravelTendencies =
      matchRequestDto.travelTendencies?.length &&
      matchRequestDto.travelTendencies.length > 0
        ? matchRequestDto.travelTendencies
        : baseTravelTendencies;

    const limit = matchRequestDto.limit ?? DEFAULT_LIMIT;

    const qb = this.matchingProfileRepository
      .createQueryBuilder('matching_profile')
      .innerJoin(
        Profile,
        'profile',
        'profile.user_id = matching_profile.user_id',
      )
      .select('matching_profile.user_id', 'userId')
      .addSelect('profile.travel_styles', 'travelStyles')
      .addSelect('profile.travel_tendency', 'travelTendencies')
      .addSelect('profile.mbti', 'mbti')
      .addSelect(
        'matching_profile.profile_embedding <=> :queryEmbedding',
        'vectorDistance',
      )
      .where('matching_profile.user_id != :userId', {
        userId: userId,
      })
      .andWhere('matching_profile.profile_embedding IS NOT NULL')
      .orderBy('vectorDistance', 'ASC')
      .limit(limit)
      .setParameter(
        'queryEmbedding',
        requesterMatchingProfile.profileEmbedding,
      );

    qb.andWhere((qb2) => {
      const subQuery = qb2
        .subQuery()
        .select('1')
        .from(Post, 'post')
        .where('post.writer_id = matching_profile.user_id') //매칭 후보가 모집 중 글을 올렸는지를 가리는 필터
        .andWhere('post.status = :recruitingStatus') //게시글이 모집중인지 구별하는 필터
        .getQuery();
      return `EXISTS ${subQuery}`;
    });
    qb.setParameter('recruitingStatus', PostStatus.RECRUITING);

    if (filterTravelStyles.length > 0) {
      qb.andWhere('profile.travel_styles && :travelStyles', {
        travelStyles: filterTravelStyles,
      });
    }

    if (filterTravelTendencies.length > 0) {
      qb.andWhere('profile.travel_tendency && :travelTendencies', {
        travelTendencies: filterTravelTendencies,
      });
    }

    const rawCandidates = await qb.getRawMany<RawMatchRow>();
    // raw result -> 가중치 기반 점수 계산 -> 점수 내림차순 정렬
    const matches = rawCandidates
      .map((row) =>
        this.toMatchCandidate(
          row,
          baseTravelStyles,
          baseTravelTendencies,
          requesterProfile.mbtiTypes ?? null,
        ),
      )
      .sort((a, b) => b.score - a.score);

    // 추천된 사용자 ID 목록을 활용해 "각 사용자당 1개의 모집중 게시글"을 매핑한다.

    //matches의 userId 목록을 넘겨 “사용자 ID → 최신 모집중 게시글 DTO” 형태의 Map을 만듬
    const recruitingPostMap = await this.loadRecruitingPostMap(
      matches.map((candidate) => candidate.userId),
    );
    // 각 매칭 후보에 대해 1:1로 게시글 요약 DTO를 붙인다. (없으면 null)
    const matchesWithPosts = matches.map((candidate) => ({
      ...candidate,
      recruitingPost: recruitingPostMap.get(candidate.userId) ?? null,
    }));

    return {
      query: {
        ...matchRequestDto,
        limit,
        travelTendencyTypes: filterTravelStyles,
        travelTendencies: filterTravelTendencies,
      },
      //matches 배열의 각 원소가 MatchCandidateDto / 그리고 그 안에 MatchRecruitingPostDto 가 있는데 거기에 postdto 내용을 넣는 것임
      matches: matchesWithPosts, //유사도 + 게시글 요약 정보
    };
  }

  private toMatchCandidate(
    row: RawMatchRow,
    baseTravelStyles: TravelStyleType[],
    baseTravelTendencies: TendencyType[],
    baseMbti: MBTI_TYPES | null,
  ): MatchCandidateDto {
    const candidateStyles = row.travelStyles ?? [];
    const candidateTendencies = row.travelTendencies ?? [];
    const styleOverlap = this.calculateOverlap(
      baseTravelStyles,
      candidateStyles,
    );
    const tendencyOverlap = this.calculateOverlap(
      baseTravelTendencies,
      candidateTendencies,
    );

    const vectorScore = this.normalizeVectorDistance(row.vectorDistance);
    const styleScore = this.calculateRatio(
      styleOverlap.length,
      baseTravelStyles.length,
    );
    const tendencyScore = this.calculateRatio(
      tendencyOverlap.length,
      baseTravelTendencies.length,
    );

    const mbtiScore = this.calculateMbtiScore(baseMbti, row.mbti);

    return {
      userId: row.userId,
      score: this.composeScore(
        vectorScore,
        styleScore,
        tendencyScore,
        mbtiScore,
      ),
      overlappingTravelTendencyTypes: styleOverlap,
      overlappingTravelTendencies: tendencyOverlap,
      mbtiMatchScore: mbtiScore,
    };
  }

  private calculateOverlap<T>(base: T[], candidate: T[]): T[] {
    if (!base.length || !candidate.length) {
      return [];
    }

    const candidateSet = new Set(candidate);
    return Array.from(new Set(base.filter((item) => candidateSet.has(item))));
  }

  private calculateRatio(overlapCount: number, baseTotal: number): number {
    if (!baseTotal || baseTotal <= 0) {
      return 0;
    }

    return overlapCount / baseTotal;
  }

  private normalizeVectorDistance(distance: number | null): number {
    if (distance === null || distance === undefined) {
      return 0;
    }

    const normalized = 1 - distance;
    if (normalized < 0) {
      return 0;
    }
    if (normalized > 1) {
      return 1;
    }
    return normalized;
  }

  private calculateMbtiScore(
    baseMbti: MBTI_TYPES | null,
    candidateMbti: MBTI_TYPES | null,
  ): number {
    if (!baseMbti || !candidateMbti) {
      return 0;
    }

    const base = baseMbti.toString().toUpperCase();
    const candidate = candidateMbti.toString().toUpperCase();
    const length = Math.min(base.length, candidate.length, 4);

    if (!length) {
      return 0;
    }

    let matches = 0;
    for (let i = 0; i < length; i += 1) {
      if (base[i] === candidate[i]) {
        matches += 1;
      }
    }

    return matches / length;
  }

  private composeScore(
    vectorScore: number,
    styleScore: number,
    tendencyScore: number,
    mbtiScore: number,
  ): number {
    return (
      VECTOR_WEIGHT * vectorScore +
      STYLE_WEIGHT * styleScore +
      TENDENCY_WEIGHT * tendencyScore +
      MBTI_WEIGHT * mbtiScore
    );
  }

  /**
   * 추천된 사용자들의 ID 목록을 입력으로 받아, 각 사용자별 최신 모집중 게시글 1개를 찾아 매핑한다.
   */
  private async loadRecruitingPostMap(
    userIds: string[],
  ): Promise<Map<string, MatchRecruitingPostDto>> {
    const map = new Map<string, MatchRecruitingPostDto>();
    if (!userIds.length) {
      return map;
    }

    // 추천된 사용자 집합 안에서 "모집 중" 상태인 게시글만 싹 모아서 사용자별로 한 건씩 매칭한다.
    const posts = await this.postRepository.find({
      where: {
        writer: { id: In(userIds) },
        status: PostStatus.RECRUITING,
      },
      relations: { writer: true },
      //order: { createdAt: 'DESC' }를 걸어 최신 글부터 내려받음
      order: { createdAt: 'DESC' },
    });

    for (const post of posts) {
      const writerId = post.writer?.id;
      //Map 자료구조는 map.has(key)로 해당 키가 등록돼 있는지 O(1)로 검사
      if (!writerId || map.has(writerId)) {
        // 사용자마다 최신 글 한 건만 노출하고 싶으므로 이미 맵에 있다면 스킵
        continue;
      }
      // 아직 등록되지 않은 사용자라면 최신 글을 DTO로 변환해 등록
      map.set(writerId, this.toRecruitingPostDto(post));
    }
    //키는 userId, 값은 해당 사용자의 최신 모집 중 게시글 DTO
    return map;
  }

  private toRecruitingPostDto(post: Post): MatchRecruitingPostDto {
    return {
      id: post.id,
      title: post.title,
      location: post.location,
      startDate: post.startDate,
      endDate: post.endDate,
      maxParticipants: post.maxParticipants,
      keywords: post.keywords ?? [],
    };
  }

  async embeddingMatchingProfile(
    userId: string,
    dto: EmbeddingMatchingProfileDto,
  ) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } }, // profile.user_id = dto.userId
      relations: ['user'], // user relation까지 같이 로드
    });
    if (!profile?.user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const user = profile.user;
    // LLM이 description을 받고 1~2줄 요약을 해줌 = summary
    const summary = await this.novaService.summarizeDescription(
      dto.description,
    );
    const matchingProfile = // 인스턴스 생성(이미 있으면 내용 추가, 아니면 생성)
      (await this.matchingProfileRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      })) ?? this.matchingProfileRepository.create({ user });
    // matching_profile 정보 넣기
    matchingProfile.profileSummary = summary;
    matchingProfile.profileEmbedding =
      (await this.titanEmbeddingService.embedText(
        summary || dto.description,
      )) ?? null;
    // 요약이 있으면 그걸 먼저 쓰고, 요약이 비어 있으면 원본 description으로 폴백

    await this.matchingProfileRepository.save(matchingProfile);
    // 실제 DB에 이 레코드 반영 (INSERT or UPDATE)
    return { success: true };
  }
}
