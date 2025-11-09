import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MatchRequestDto } from './dto/match-request.dto';
import { MatchCandidateDto, MatchResponseDto } from './dto/match-response.dto';
import { Profile } from '../profile/entities/profile.entity';
import { TravelStyleType } from '../profile/entities/travel-style-type.enum';
import { TendencyType } from '../profile/entities/tendency-type.enum';
import { Post } from '../post/entities/post.entity';
import { PostStatus } from '../post/entities/post-status.enum';
import { MBTI_TYPES } from '../profile/entities/mbti.enum';
import { SyncMatchingProfileDto } from './dto/sync-matching-profile.dto';
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
    private readonly novaService: NovaService,
    private readonly titanEmbeddingService: TitanEmbeddingService,
  ) {}

  async findMatches(
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchResponseDto> {
    const requesterProfile = await this.profileRepository.findOne({
      where: { user: { id: matchRequestDto.userId } },
      relations: { user: true },
    });

    if (!requesterProfile) {
      throw new NotFoundException('요청한 사용자의 프로필을 찾을 수 없습니다.');
    }

    const requesterMatchingProfile =
      await this.matchingProfileRepository.findOne({
        where: { user: { id: matchRequestDto.userId } },
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
        userId: matchRequestDto.userId,
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
        .where('post.writer_id = matching_profile.user_id')
        .andWhere('post.status = :recruitingStatus')
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
      query: {
        ...matchRequestDto,
        limit,
        travelTendencyTypes: filterTravelStyles,
        travelTendencies: filterTravelTendencies,
      },
      matches,
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

  async syncMatchingProfile(dto: SyncMatchingProfileDto) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: dto.userId } }, // profile.user_id = dto.userId
      relations: ['user'], // user relation까지 같이 로드
    });
    if (!profile?.user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    const user = profile.user;
    // LLM이 description을 받고 1~2줄 요약을 해줌 = summary
    const summary = await this.novaService.summarizeDescription(
      dto.description,
    );
    const matchingProfile = // 인스턴스 생성(이미 있으면 내용 추가, 아니면 생성)
      (await this.matchingProfileRepository.findOne({
        where: { user: { id: dto.userId } },
        relations: ['user'],
      })) ?? this.matchingProfileRepository.create({ user });
    // matching_profile 정보 넣기
    matchingProfile.profileDetail = dto.description;
    matchingProfile.profileSummary = summary;
    matchingProfile.travelTendencyTypes = dto.travelTendencyTypes ?? [];
    matchingProfile.travelTendencies = dto.travelTendencies ?? [];
    matchingProfile.profileEmbedding =
      (await this.titanEmbeddingService.embedText(
        summary || dto.description,
      )) ?? null;
    // 요약이 있으면 그걸 먼저 쓰고, 요약이 비어 있으면 원본 description으로 폴백

    return this.matchingProfileRepository.save(matchingProfile);
    // 실제 DB에 이 레코드 반영 (INSERT or UPDATE)
  }
}
