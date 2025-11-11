import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

// Postgres enum[] 필드가 상황에 따라 `{"값","값"}` 문자열로 내려오기 때문에
// raw 결과를 그대로 쓰면 겹침 계산이 항상 빈 배열이 된다.
// string ↔ T[] 변환을 통일하려고 아래 유틸을 둔다.
type DbEnumArray<T> = T[] | string | null;

interface RawMatchRow {
  userId: string;
  travelStyles: DbEnumArray<TravelStyleType>;
  travelTendencies: DbEnumArray<TendencyType>;
  vectorDistance: number | null;
  mbti: MBTI_TYPES | null;
}

interface MatchCandidatesResult {
  matches: MatchCandidateDto[];
  query: MatchRequestDto;
}

const DEFAULT_LIMIT = 5;
const VECTOR_WEIGHT = 0.3;
const STYLE_WEIGHT = 0.25;
const MBTI_WEIGHT = 0.25;
const TENDENCY_WEIGHT = 0.2;

// pgvector 연산자는 `[0.1,0.2,...]` 문자열만 받으므로 요청자 임베딩을 그대로 전달하면 에러가 난다.
// DB에는 number[]가 저장돼 있으니, 쿼리 파라미터에 넣기 전에 문자열 리터럴로 변환해준다.
const toVectorLiteral = (vector: number[] | null | undefined): string => {
  if (!vector || vector.length === 0) {
    throw new BadRequestException('임베딩 벡터가 비어 있습니다.');
  }
  return `[${vector.join(',')}]`;
};

@Injectable()
export class MatchingService {
  constructor(
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
  ): Promise<MatchCandidateDto[]> {
    const { matches } = await this.buildMatchCandidatesResult(
      userId,
      matchRequestDto,
    );
    return matches;
  }

  async findMatchesWithRecruitingPosts(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchResponseDto> {
    const { matches, query } = await this.buildMatchCandidatesResult(
      userId,
      matchRequestDto,
    );

    const recruitingPostMap = await this.loadRecruitingPostMap(
      matches.map((candidate) => candidate.userId),
    );

    const matchesWithPosts = matches.map((candidate) => ({
      ...candidate,
      recruitingPost: recruitingPostMap.get(candidate.userId) ?? null,
    }));

    return {
      query,
      matches: matchesWithPosts,
    };
  }

  private async buildMatchCandidatesResult(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchCandidatesResult> {
    const requesterProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!requesterProfile) {
      throw new NotFoundException('요청한 사용자의 프로필을 찾을 수 없습니다.');
    }

    if (!requesterProfile.profileEmbedding) {
      throw new BadRequestException(
        '요청한 사용자의 임베딩 정보가 아직 준비되지 않았습니다.',
      );
    }
    //MatchRequestDto에서 보낸게 없으면 profile 데이터에서 찾아옴 =baseTravelStyles,baseTravelTendencies
    const baseTravelStyles = requesterProfile.travelStyles ?? [];
    const baseTravelTendencies = requesterProfile.tendency ?? [];

    const filterTravelStyles =
      matchRequestDto.travelStyleTypes?.length &&
      matchRequestDto.travelStyleTypes.length > 0
        ? matchRequestDto.travelStyleTypes
        : baseTravelStyles;

    const filterTravelTendencies =
      matchRequestDto.travelTendencies?.length &&
      matchRequestDto.travelTendencies.length > 0
        ? matchRequestDto.travelTendencies
        : baseTravelTendencies;

    const limit = matchRequestDto.limit ?? DEFAULT_LIMIT;

    const qb = this.profileRepository
      .createQueryBuilder('profile')
      .select('profile.user_id', 'userId')
      .addSelect('profile.travel_styles', 'travelStyles')
      .addSelect('profile.tendency', 'travelTendencies')
      .addSelect('profile.mbti', 'mbti')
      .addSelect(
        'profile.profile_embedding <=> :queryEmbedding',
        'vectorDistance',
      )
      .where('profile.user_id != :userId', {
        userId,
      })
      .andWhere('profile.profile_embedding IS NOT NULL')
      .orderBy('profile.profile_embedding <=> :queryEmbedding', 'ASC')
      .limit(limit)
      .setParameter(
        'queryEmbedding',
        toVectorLiteral(requesterProfile.profileEmbedding),
      );

    qb.andWhere((qb2) => {
      const subQuery = qb2
        .subQuery()
        .select('1')
        .from(Post, 'post')
        .where('post.writer_id = profile.user_id') //매칭 후보가 모집 중 글을 올렸는지를 가리는 필터
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
      qb.andWhere('profile.tendency && :travelTendencies', {
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

    return {
      matches,
      query: {
        ...matchRequestDto,
        limit,
        travelStyleTypes: filterTravelStyles,
        travelTendencies: filterTravelTendencies,
      },
    };
  }

  private toMatchCandidate(
    row: RawMatchRow,
    baseTravelStyles: TravelStyleType[],
    baseTravelTendencies: TendencyType[],
    baseMbti: MBTI_TYPES | null,
  ): MatchCandidateDto {
    const candidateStyles = this.normalizeEnumArray(row.travelStyles);
    const candidateTendencies = this.normalizeEnumArray(row.travelTendencies);
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

  private normalizeEnumArray<T>(value: DbEnumArray<T> | undefined): T[] {
    // QueryBuilder raw 결과가 배열이라면 그대로 반환하고,
    // '{"FOO","BAR"}' 형태라면 괄호/따옴표를 제거해 T[]로 바꿔준다.
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    const trimmed = value.replace(/[{}]/g, '').trim();
    if (!trimmed) {
      return [];
    }
    return trimmed
      .split(',')
      .map((item) => item.replace(/^"(.*)"$/, '$1') as T)
      .filter((item) => item !== undefined && item !== null && item !== '');
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
      console.warn('[embeddingMatchingProfile] profile not found', userId);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // LLM이 description을 받고 1~2줄 요약을 해줌 = summary
    const summary = await this.novaService.summarizeDescription(
      dto.description,
    );
    const profileEmbedding = await this.titanEmbeddingService.embedText(
      summary || dto.description,
    );
    profile.profileEmbedding = profileEmbedding;
    await this.profileRepository.save(profile);
    //return { summary, profileEmbedding };
    return true;
  }
}
