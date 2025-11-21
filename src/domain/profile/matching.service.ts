import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MatchRequestDto } from './dto/match-request.dto';
import {
  MatchCandidateDto,
  MatchRecruitingPostDto,
  MatchResponseDto,
} from './dto/match-response.dto';
import { Profile } from './entities/profile.entity';
import { TravelStyleType } from './entities/travel-style-type.enum';
import { TendencyType } from './entities/tendency-type.enum';
import { Post } from '../post/entities/post.entity';
import { PostStatus } from '../post/entities/post-status.enum';
import { PostParticipation } from '../post-participation/entities/post-participation.entity.js';
import { MBTI_TYPES } from './entities/mbti.enum';
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
  //mannerTemperature?: number | null;
  mbti: MBTI_TYPES | null;
  // profileImageId?: string; // Add profileImageId field
}

interface MatchCandidatesResult {
  matches: MatchCandidateDto[];
  query: MatchRequestDto;
}

const DEFAULT_LIMIT = 150;
const POST_DEFAULT_LIMIT = 4;
const VECTOR_WEIGHT = 0.3;
const STYLE_WEIGHT = 0.25;
const MBTI_WEIGHT = 0.25;
const TENDENCY_WEIGHT = 0.2;
const SCORE_OFFSET = 0.15;
const SCORE_CAP = 0.99;
const MAX_TENDENCY_OVERLAPS = 5;
const SUMMARY_CHAR_LIMIT = 500;

interface CategoryMeta {
  group: string;
  label: string;
}

const TRAVEL_STYLE_CATEGORY_MAP: Record<TravelStyleType, CategoryMeta> = {
  [TravelStyleType.ADVENTUROUS]: { group: '도전 성향', label: '모험적' },
  [TravelStyleType.SPONTANEOUS]: { group: '즉흥 성향', label: '즉흥적' },

  [TravelStyleType.RELAXED]: { group: '휴식 선호', label: '느긋한' },
  [TravelStyleType.HEALING]: { group: '휴식 선호', label: '힐링' },
  [TravelStyleType.ACTIVE]: { group: '활동 선호', label: '활동적' },

  [TravelStyleType.METICULOUS]: { group: '준비 철학', label: '계획적' },
  [TravelStyleType.EFFICIENT]: { group: '준비 철학', label: '효율적' },

  [TravelStyleType.EXTROVERTED]: { group: '사교 성향-외향', label: '외향적' },
  [TravelStyleType.SOCIABLE]: { group: '사교 성향-외향', label: '사교적' },
  [TravelStyleType.INTROVERTED]: { group: '사교 성향-내향', label: '내향적' },

  [TravelStyleType.INDEPENDENT]: { group: '참여 방식', label: '독립적' },
  [TravelStyleType.PROACTIVE]: { group: '참여 방식', label: '주도적' },

  [TravelStyleType.ROMANTIC]: { group: '감성 기조', label: '낭만' },
  [TravelStyleType.EMOTIONAL]: { group: '감성 기조', label: '감성적' },
  [TravelStyleType.RATIONAL]: { group: '사고 기조', label: '이성적' },

  [TravelStyleType.BUDGET_FRIENDLY]: { group: '예산 철학', label: '가성비' },
};

const TRAVEL_TENDENCY_CATEGORY_MAP: Record<TendencyType, CategoryMeta> = {
  [TendencyType.CITY]: { group: '여행지 분위기-대도시', label: '도시' },
  [TendencyType.RURAL]: { group: '여행지 분위기-시골', label: '시골' },
  [TendencyType.TRADITIONAL_CITY]: {
    group: '여행지 분위기-전통',
    label: '전통도시',
  },
  [TendencyType.RESORT_CITY]: {
    group: '여행지 분위기-휴양',
    label: '휴양도시',
  },
  [TendencyType.PORT_TOWN]: { group: '여행지 분위기-항구', label: '항구도시' },
  [TendencyType.ARCHITECTURE_TOUR]: { group: '도시 감상', label: '건축물탐방' },
  [TendencyType.NIGHT_VIEW]: { group: '도시 감상', label: '야경감상' },
  [TendencyType.TRADITIONAL_MARKET]: {
    group: '도시 로컬 체험',
    label: '전통시장',
  },
  [TendencyType.SHOPPING]: { group: '도시 로컬 체험', label: '쇼핑' },

  [TendencyType.BEACH]: { group: '자연 경관-해양', label: '바다' },
  [TendencyType.ISLAND]: { group: '자연 경관-해양', label: '섬' },
  [TendencyType.MOUNTAIN]: { group: '자연 경관-산악', label: '산' },
  [TendencyType.VALLEY]: { group: '자연 경관-산악', label: '계곡' },
  [TendencyType.LAKE]: { group: '자연 경관-호수', label: '호수' },
  [TendencyType.FLOWER_VIEWING]: { group: '자연 경관-꽃정원', label: '꽃구경' },
  [TendencyType.TREKKING]: { group: '트레킹/산행', label: '트레킹' },
  [TendencyType.MOUNTAINEERING]: { group: '트레킹/산행', label: '등산' },
  [TendencyType.CAMPING]: { group: '야외 체류-캠핑', label: '캠핑' },
  [TendencyType.CYCLING]: { group: '야외 액티비티-자전거', label: '자전거' },
  [TendencyType.SURFING]: { group: '워터 액티비티-서핑', label: '서핑' },
  [TendencyType.SNORKELING]: {
    group: '워터 액티비티-바다안에서',
    label: '스노클링',
  },
  [TendencyType.FREEDIVING]: {
    group: '워터 액티비티-바다안에서',
    label: '프리다이빙',
  },
  [TendencyType.FISHING]: { group: '워터 액티비티-바다밖에서', label: '낚시' },
  [TendencyType.SKIING]: { group: '겨울 액티비티', label: '스키' },
  [TendencyType.SNOWBOARDING]: { group: '겨울 액티비티', label: '스노보드' },
  [TendencyType.GOLF]: { group: '필드 액티비티', label: '골프' },

  [TendencyType.MUSEUM]: { group: '문화 감상', label: '박물관' },
  [TendencyType.GALLERY]: { group: '문화 감상', label: '미술관' },
  [TendencyType.HERITAGE_TOUR]: { group: '역사 체험', label: '유적지탐방' },
  [TendencyType.MUSICAL_SHOW]: { group: '공연/이벤트', label: '공연뮤지컬' },
  [TendencyType.CONCERT]: { group: '공연/이벤트', label: '콘서트' },
  [TendencyType.SPORTS_VIEWING]: { group: '공연/이벤트', label: '스포츠관람' },
  [TendencyType.AMUSEMENT_PARK]: { group: '테마 체험', label: '놀이공원' },
  [TendencyType.AQUARIUM]: { group: '테마 체험', label: '아쿠아리움' },
  [TendencyType.ZOO]: { group: '테마 체험', label: '동물원' },
  [TendencyType.NIGHT_MARKET]: { group: '로컬 축제', label: '야시장' },
  [TendencyType.LOCAL_FESTIVAL]: { group: '로컬 축제', label: '현지축제' },

  [TendencyType.STREET_FOOD]: { group: '미식 탐방', label: '길거리음식' },
  [TendencyType.LOCAL_RESTAURANT]: {
    group: '미식 탐방',
    label: '로컬레스토랑',
  },
  [TendencyType.FOODIE_TOUR]: { group: '미식 탐방', label: '맛집탐방' },
  [TendencyType.CAFE_DESSERT]: {
    group: '미식 탐방-카페',
    label: '카페디저트',
  },

  [TendencyType.HOTEL_STAYCATION]: { group: '휴식/웰니스', label: '호캉스' },
  [TendencyType.SCENIC_DRIVE]: {
    group: '휴식/웰니스-드라이브',
    label: '경치드라이브',
  },
  [TendencyType.QUIET_RELAXATION]: {
    group: '휴식/웰니스',
    label: '조용한휴식',
  },

  [TendencyType.TRANSPORT_RENTAL_CAR]: {
    group: '이동 수단-자차',
    label: '렌터카',
  },
  [TendencyType.MOTORCYCLE_TRIP]: {
    group: '이동 수단-바이크',
    label: '오토바이여행',
  },
  [TendencyType.CAMPER_VAN]: { group: '이동 수단-캠핑카', label: '캠핑카' },
  [TendencyType.PUBLIC_TRANSPORT]: {
    group: '이동 수단-대중교통',
    label: '대중교통',
  },
  [TendencyType.TRAIN_TRIP]: { group: '이동 수단-기차', label: '기차여행' },
  [TendencyType.RUNNING]: { group: '이동 수단-러닝', label: '러닝' },

  [TendencyType.PACKED_SCHEDULE]: {
    group: '일정 스타일-타이트',
    label: '빡빡한일정',
  },
  [TendencyType.LEISURELY_SCHEDULE]: {
    group: '일정 스타일-여유',
    label: '여유로운일정',
  },

  [TendencyType.HOTEL]: { group: '숙소 선호-호텔', label: '호텔' },
  [TendencyType.RESORT]: { group: '숙소 선호-리조트', label: '리조트' },
  [TendencyType.GUESTHOUSE]: {
    group: '숙소 선호-게스트하우스',
    label: '게스트하우스',
  },
  [TendencyType.MOTEL]: { group: '숙소 선호-모텔', label: '모텔' },
  [TendencyType.PENSION]: { group: '숙소 선호-펜션', label: '펜션' },
  [TendencyType.AIRBNB]: { group: '숙소 선호-에어비앤비', label: '에어비앤비' },
  [TendencyType.GLAMPING]: { group: '숙소 선호-글램핑', label: '글램핑' },
  [TendencyType.PRIVATE_POOL_VILLA]: {
    group: '숙소 선호-풀빌라',
    label: '풀빌라',
  },

  [TendencyType.VEGAN_FRIENDLY]: { group: '식단 제약-비건', label: '비건필요' },
  [TendencyType.NO_PORK]: {
    group: '식단 제약-돼지고기',
    label: '돼지고기비선호',
  },
  [TendencyType.NO_SEAFOOD]: {
    group: '식단 제약-해산물',
    label: '해산물비선호',
  },

  [TendencyType.SPICY_FOOD_PREF]: {
    group: '미식 선호-매운맛',
    label: '매운맛선호',
  },
  [TendencyType.MILD_FOOD_PREF]: {
    group: '미식 선호-순한맛',
    label: '순한맛선호',
  },
  [TendencyType.SEAFOOD_PREF]: {
    group: '미식 선호-해산물',
    label: '해산물선호',
  },
  [TendencyType.MEAT_PREF]: { group: '미식 선호-육류', label: '육류선호' },

  [TendencyType.BACKPACKING]: { group: '도보 여행 방식', label: '배낭여행' },
  [TendencyType.CAN_DRIVE]: { group: '자동차 여행 방식', label: '운전가능' },
  [TendencyType.PHOTOGRAPHY]: { group: '사진 활동', label: '사진촬영' },
  [TendencyType.LANDSCAPE_PHOTOGRAPHY]: {
    group: '사진 활동',
    label: '풍경촬영',
  },

  [TendencyType.NON_SMOKER]: { group: '흡연여부-비흡연', label: '비흡연' },
  [TendencyType.SMOKER]: { group: '흡연여부-흡연', label: '흡연' },
  [TendencyType.NON_DRINKING]: { group: '음주여부-비음주', label: '비음주' },
  [TendencyType.DRINKS_ALCOHOL]: { group: '음주여부-음주', label: '음주' },

  [TendencyType.SMALL_GROUP_PREFERRED]: {
    group: '조용소규모',
    label: '소수인원선호',
  },
  [TendencyType.QUIET_COMPANION_PREFERRED]: {
    group: '조용소규모',
    label: '조용한동행선호',
  },
  [TendencyType.TALKATIVE_COMPANION_PREFERRED]: {
    group: '성향활발',
    label: '수다떠는동행선호',
  },

  [TendencyType.SPEND_ON_FOOD]: {
    group: '소비 우선순위-음식',
    label: '음식우선',
  },
  [TendencyType.SPEND_ON_LODGING]: {
    group: '소비 우선순위-숙소',
    label: '숙소우선',
  },
};

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

  // 유저별 매칭 정보 + 신청 가능한 모집글 한 건씩 묶어서 반환한다.
  async findMatches(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchCandidateDto[]> {
    // 유사도 상위 후보를 넉넉하게 불러와서 이후 게시글 필터링으로 탈락해도 원하는 수량을 유지한다.
    const matchResult = await this.buildMatchCandidatesResult(
      userId,
      matchRequestDto,
    );
    const requestedLimit = matchResult.query.limit ?? DEFAULT_LIMIT;

    if (!matchResult.matches.length) {
      return [];
    }

    const writerIds = matchResult.matches.map((match) => match.userId);
    // 사용자가 이미 참가/신청한 게시글은 제외한 뒤, 각 사용자별 대표 모집글을 찾는다.
    //“각 후보 사용자에게 아직 신청하지 않은 모집글이 있는가?”
    const recruitingPostMap = await this.fetchAvailableRecruitingPosts(
      writerIds,
      userId,
    );
    //응답 형식은 MatchCandidateDto에 recruitingPosts 배열을 붙이는 작업
    const candidatesWithPosts = matchResult.matches
      .map((candidate) => {
        const post = recruitingPostMap.get(candidate.userId);
        if (!post) {
          // 해당 사용자에게 조건을 만족하는 모집글이 없으면 제외한다.
          return null;
        }
        // 매칭 정보 + 모집글 1건을 묶어서 반환할 DTO로 변환한다.
        return {
          ...candidate,
          recruitingPosts: [this.toRecruitingPostDto(post)],
        };
      })
      .filter(
        (
          candidate,
        ): candidate is MatchCandidateDto & {
          recruitingPosts: MatchRecruitingPostDto[];
        } => candidate !== null,
      );

    return candidatesWithPosts.slice(0, requestedLimit);
  }

  //전체 유저에서 나와 맞는 유저 찾기
  async findMatchesWithAllUsers(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchCandidateDto[]> {
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

    // MatchRequestDto에서 보낸게 없으면 profile 데이터에서 찾아옴 = baseTravelStyles, baseTravelTendencies
    const baseTravelStyles = requesterProfile.travelStyles ?? [];
    const baseTravelTendencies = requesterProfile.tendency ?? [];

    const limit = matchRequestDto.limit ?? POST_DEFAULT_LIMIT;

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
      .where('profile.user_id != :userId', { userId })
      .andWhere('profile.profile_embedding IS NOT NULL')
      .orderBy('profile.profile_embedding <=> :queryEmbedding', 'ASC')
      .limit(limit + 10)
      .setParameter(
        'queryEmbedding',
        toVectorLiteral(requesterProfile.profileEmbedding),
      );

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

    const slicedMatches = matches.slice(0, limit);

    // ✅ 여기서부터 profile 붙이기

    // 1) 매칭된 userId 리스트 뽑기
    const targetUserIds: string[] = slicedMatches.map((m) => m.userId);
    if (targetUserIds.length === 0) {
      return [];
    }

    // 2) 해당 유저들의 프로필을 한 번에 조회 (필요한 relation까지)
    const profiles = await this.profileRepository.find({
      where: { user: { id: In(targetUserIds) } },
      relations: {
        user: true,
        profileImage: true, // 프로필 이미지까지 필요하면
      },
    });

    // 3) userId -> profile 매핑
    const profileMap = new Map<string, Profile>();
    for (const profile of profiles) {
      if (profile.user?.id) {
        profileMap.set(profile.user.id, profile);
      }
    }

    slicedMatches.forEach((m) => {
      const profile = profileMap.get(m.userId);
      if (!profile) {
        m.profile = null;
        return;
      }
      //profile붙여주기
      m.profile = {
        nickname: profile.nickname ?? '',
        //  mbtiTypes: profile.mbtiTypes ?? null,
        profileImageId: profile.profileImage?.id ?? null,
        mannerTemperature: profile.mannerTemperature ?? null,
      };
    });

    return slicedMatches;
  }

  //전체글에서 필터링한 글들 유저성향이 나와 가장 맞는 사람들부터 보여주기
  async findMatchesWithRecruitingPosts(
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

    if (!requesterProfile.profileEmbedding) {
      throw new BadRequestException(
        '요청한 사용자의 임베딩 정보가 아직 준비되지 않았습니다.',
      );
    }

    const baseTravelStyles = requesterProfile.travelStyles ?? [];
    const baseTravelTendencies = requesterProfile.tendency ?? [];

    const qb = this.postRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.writer', 'writer')
      .innerJoinAndSelect('writer.profile', 'profile')
      .leftJoinAndSelect('post.image', 'image') // Join with post image entity
      .leftJoinAndSelect('profile.profileImage', 'profileImage') // Join with profile image entity
      .where('writer.id != :userId', { userId })
      .andWhere('post.status = :status', { status: PostStatus.RECRUITING })
      .andWhere('profile.profile_embedding IS NOT NULL')
      .addSelect(
        'profile.profile_embedding <=> :queryEmbedding',
        'vectorDistance',
      )
      .setParameter(
        'queryEmbedding',
        toVectorLiteral(requesterProfile.profileEmbedding),
      );

    if (matchRequestDto.startDate) {
      qb.andWhere('post.start_date >= :startDate', {
        startDate: matchRequestDto.startDate,
      });
    }
    if (matchRequestDto.endDate) {
      qb.andWhere('post.end_date <= :endDate', {
        endDate: matchRequestDto.endDate,
      });
    }
    if (matchRequestDto.locationQuery) {
      qb.andWhere(
        '(post.location ILIKE :location OR post.title ILIKE :location)',
        {
          location: `%${matchRequestDto.locationQuery.trim()}%`,
        },
      );
    }
    if (matchRequestDto.keywords?.length) {
      qb.andWhere('post.keywords && :keywords', {
        keywords: matchRequestDto.keywords,
      });
    }
    if (matchRequestDto.limit) {
      qb.take(matchRequestDto.limit);
    }

    const { raw, entities: posts } = await qb.getRawAndEntities();
    const rawEntries = raw as Array<{
      vectorDistance?: string | number | null;
    }>;

    const grouped = new Map<
      string,
      {
        profile: Profile;
        posts: MatchRecruitingPostDto[];
        vectorDistance: number;
      }
    >();

    posts.forEach((post, index) => {
      const writer = post.writer;
      const profile = writer?.profile;
      if (!writer || !profile) {
        return;
      }
      const dto = this.toRecruitingPostDto(post);
      const vectorDistance = Number(rawEntries[index]?.vectorDistance ?? 0);
      const entry = grouped.get(writer.id);
      if (entry) {
        entry.posts.push(dto);
      } else {
        grouped.set(writer.id, {
          profile,
          posts: [dto],
          vectorDistance,
        });
      }
    });

    const matches = Array.from(grouped.entries())
      .map(([writerId, { profile, posts, vectorDistance }]) => {
        const row: RawMatchRow = {
          userId: writerId,
          travelStyles: profile.travelStyles,
          travelTendencies: profile.tendency,
          vectorDistance,
          mbti: profile.mbtiTypes ?? null,
          //mannerTemperature: profile.mannerTemperature, // Add mannerTemperature
          //profileImageId: profile.profileImage?.id, // Assign profileImageId
        };
        const candidate = this.toMatchCandidate(
          row,
          baseTravelStyles,
          baseTravelTendencies,
          requesterProfile.mbtiTypes ?? null,
        );
        candidate.profile = {
          nickname: profile.nickname ?? '',
          // mbtiTypes: profile.mbtiTypes ?? null,
          mannerTemperature: profile.mannerTemperature ?? null,
          profileImageId: profile.profileImage?.id ?? null,
        };
        return {
          ...candidate,
          recruitingPosts: posts,
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      query: matchRequestDto,
      matches,
    };
  }

  // 요청자 프로필과 조건을 기준으로 매칭 후보 목록/쿼리 정보를 계산한다.
  private async buildMatchCandidatesResult(
    userId: string,
    matchRequestDto: MatchRequestDto,
  ): Promise<MatchCandidatesResult> {
    const requesterProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: { user: true, profileImage: true }, // Add profileImage relation
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
    const limitBarrier = Math.max(limit, 30);

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
      .leftJoinAndSelect('profile.profileImage', 'profileImage') // Join with profile image entity
      .where('profile.user_id != :userId', {
        userId,
      })
      .andWhere('profile.profile_embedding IS NOT NULL')
      .orderBy('profile.profile_embedding <=> :queryEmbedding', 'ASC')
      .limit(limitBarrier) //30보다 작으면 무조건 30개를 벡터유사도로 잘라 비교함
      .setParameter(
        'queryEmbedding',
        toVectorLiteral(requesterProfile.profileEmbedding),
      );

    qb.andWhere((qb2) => {
      const subQuery = qb2
        .subQuery()
        .select('1')
        .from(Post, 'post')
        // 후보 프로필이 작성한 게시글 중
        .where('post.writer_id = profile.user_id')
        // 현재 모집 중인 글이 하나라도 있는지를 체크한다.
        .andWhere('post.status = :recruitingStatus')
        // 이미 내가 신청/참여한 게시글은 제외해야 하므로 NOT EXISTS로 필터링
        .andWhere((qb3) => {
          const participationSubQuery = qb3
            .subQuery()
            .select('1')
            .from(PostParticipation, 'pp')
            // post_participation에 현재 글 + 내가 신청한 기록이 있으면 제외한다.
            .where('pp.post_id = post.id')
            .andWhere('pp.requester_id = :userId')
            .getQuery();
          return `NOT EXISTS ${participationSubQuery}`;
        })
        .getQuery();
      return `EXISTS ${subQuery}`;
    });
    qb.setParameter('recruitingStatus', PostStatus.RECRUITING);

    //겹치는 항목이 하나라도 있어야 해당
    // if (filterTravelStyles.length > 0) {
    //   qb.andWhere('profile.travel_styles && :travelStyles', {
    //     travelStyles: filterTravelStyles,
    //   });
    // }

    // if (filterTravelTendencies.length > 0) {
    //   qb.andWhere('profile.tendency && :travelTendencies', {
    //     travelTendencies: filterTravelTendencies,
    //   });
    //}

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

    const slicedMatches = matches.slice(0, limit);

    return {
      matches: slicedMatches,
      query: {
        ...matchRequestDto,
        limit,
        travelStyleTypes: filterTravelStyles,
        travelTendencies: filterTravelTendencies,
      },
    };
  }

  private async fetchAvailableRecruitingPosts(
    writerIds: string[],
    userId: string,
  ): Promise<Map<string, Post>> {
    // 후보 사용자별로 아직 신청하지 않은 모집글을 한 건씩 매핑하기 위한 헬퍼
    if (!writerIds.length) {
      return new Map();
    }

    const qb = this.postRepository
      .createQueryBuilder('post')
      // 후보 사용자(writer)의 모집 중(post.status=RECRUITING) 게시글만 조회한다.
      .innerJoinAndSelect('post.writer', 'writer')
      .where('writer.id IN (:...writerIds)', { writerIds })
      .andWhere('post.status = :status', { status: PostStatus.RECRUITING })
      // 내가 작성한 글은 제외한다.
      .andWhere('post.writer_id != :userId', { userId })
      // post_participation에서 내가 신청한 기록이 있는 글은 제외한다.
      .andWhere((qb2) => {
        const participationSubQuery = qb2
          .subQuery()
          .select('1')
          .from(PostParticipation, 'pp')
          .where('pp.post_id = post.id')
          .andWhere('pp.requester_id = :userId')
          .getQuery();
        return `NOT EXISTS ${participationSubQuery}`;
      });

    const posts = await qb.getMany();
    const map = new Map<string, Post>();

    posts.forEach((post) => {
      const writerId = post.writer?.id;
      if (!writerId || map.has(writerId)) {
        return;
      }
      map.set(writerId, post);
    });

    return map;
  }

  private toMatchCandidate(
    row: RawMatchRow,
    baseTravelStyles: TravelStyleType[],
    baseTravelTendencies: TendencyType[],
    baseMbti: MBTI_TYPES | null,
  ): MatchCandidateDto {
    // raw row를 점수/겹치는 항목 정보가 포함된 DTO로 변환한다.
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
    const styleScore = this.calculateCosineSimilarity(
      styleOverlap.length,
      baseTravelStyles.length,
      candidateStyles.length,
    );
    const tendencyScore = this.calculateCosineSimilarity(
      tendencyOverlap.length,
      baseTravelTendencies.length,
      candidateTendencies.length,
    );

    const mbtiScore = this.calculateMbtiScore(baseMbti, row.mbti);

    const candidate = {
      userId: row.userId,
      score: this.composeScore(
        vectorScore,
        styleScore,
        tendencyScore,
        mbtiScore,
      ),
      vectorScore: vectorScore,
      styleScore: styleScore,
      tendencyScore: tendencyScore,
      overlappingTravelStyles: styleOverlap,
      overlappingTendencies: tendencyOverlap.slice(0, MAX_TENDENCY_OVERLAPS),
      mbtiMatchScore: mbtiScore,
    } as MatchCandidateDto;

    return candidate;
  }

  private calculateOverlap<T>(base: T[], candidate: T[]): T[] {
    if (!base.length || !candidate.length) {
      return [];
    }

    const candidateSet = new Set(candidate);
    return Array.from(new Set(base.filter((item) => candidateSet.has(item))));
  }

  private normalizeEnumArray<T>(value: DbEnumArray<T> | undefined): T[] {
    // TypeORM raw 쿼리는 상황에 따라 enum[]을 `[ 'FOO', 'BAR' ]` 배열이나
    // `{"FOO","BAR"}` 문자열 중 하나로 내려보낸다. 계산 로직은 항상 T[]를
    // 기대하므로 문자열로 내려온 경우에도 괄호/따옴표를 제거해 동일한 배열로 맞춘다.
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

  private calculateCosineSimilarity(
    overlapCount: number,
    baseTotal: number,
    candidateTotal: number,
  ): number {
    if (!baseTotal || !candidateTotal) {
      return 0;
    }

    const denominator = Math.sqrt(baseTotal * candidateTotal);
    if (!denominator || denominator <= 0) {
      return 0;
    }

    return overlapCount / denominator;
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
    const weightedScore =
      VECTOR_WEIGHT * vectorScore +
      STYLE_WEIGHT * styleScore +
      TENDENCY_WEIGHT * tendencyScore +
      MBTI_WEIGHT * mbtiScore;
    const adjustedScore = weightedScore + SCORE_OFFSET;
    return Math.min(adjustedScore, SCORE_CAP);
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
      imageId: post.image?.id, // Add imageId from post.image.id
    };
  }

  async embeddingMatchingProfile(
    userId: string,
    dto: EmbeddingMatchingProfileDto,
  ) {
    // 프로필 존재/소유 여부 검사 후 임베딩 텍스트를 만들고 Titan에 벡터화를 위임한다.
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } }, // profile.user_id = dto.userId
      relations: ['user'], // user relation까지 같이 로드
    });
    if (!profile?.user) {
      console.warn('[embeddingMatchingProfile] profile not found', userId);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const embeddingText = await this.composeProfileEmbeddingText(
      profile,
      dto.description ?? profile.description ?? '',
    );

    const profileEmbedding =
      await this.titanEmbeddingService.embedText(embeddingText);

    if (!profileEmbedding) {
      throw new BadRequestException('임베딩 벡터 생성에 실패했습니다.');
    }

    profile.profileEmbedding = profileEmbedding;
    await this.profileRepository.save(profile);
    return true;
  }

  private async composeProfileEmbeddingText(
    profile: Profile,
    description: string,
  ): Promise<string> {
    // 스타일/성향/소개 정보를 섹션 단위 텍스트로 만들어 Titan 입력으로 사용한다.
    const travelStyleLines = this.buildCategoryLines(
      profile.travelStyles ?? [],
      TRAVEL_STYLE_CATEGORY_MAP,
    );
    const travelTendencyLines = this.buildCategoryLines(
      profile.tendency ?? [],
      TRAVEL_TENDENCY_CATEGORY_MAP,
    );
    const summary = await this.buildDescriptionSummary(description);

    const sections: string[] = [];
    const styleSection = this.buildSection('여행 스타일', travelStyleLines);
    if (styleSection) {
      sections.push(styleSection);
    }
    const tendencySection = this.buildSection('여행 성향', travelTendencyLines);
    if (tendencySection) {
      sections.push(tendencySection);
    }
    if (summary) {
      sections.push(`[상세소개]\n${summary}`);
    }

    if (!sections.length) {
      throw new BadRequestException(
        '임베딩에 사용할 프로필 정보가 충분하지 않습니다.',
      );
    }

    return sections.join('\n\n');
  }

  private buildCategoryLines<T extends string>(
    values: T[] | null | undefined,
    dictionary: Record<T, CategoryMeta>,
  ): string[] {
    // enum 배열을 그룹별 문자열 목록으로 변환한다. (중복 제거 + 그룹 단위 묶음)
    if (!values?.length) {
      return [];
    }

    const grouped = new Map<string, Set<string>>();
    for (const value of new Set(values)) {
      const meta = dictionary[value] ?? { group: '기타', label: value };
      if (!grouped.has(meta.group)) {
        grouped.set(meta.group, new Set());
      }
      grouped.get(meta.group)!.add(meta.label);
    }

    return Array.from(grouped.entries()).map(
      ([group, labels]) => `[${group}] ${Array.from(labels).join(', ')}`,
    );
  }

  private buildSection(title: string, lines: string[]): string | null {
    if (!lines.length) {
      return null;
    }
    return `[${title}]\n${lines.join('\n')}`;
  }

  //정규식으로 모든 공백을 단일 스페이스로 바꾸고 앞뒤 공백을 잘라 줌
  private async buildDescriptionSummary(
    rawDescription?: string,
  ): Promise<string> {
    const normalized = this.normalizeWhitespace(rawDescription);
    if (!normalized) {
      return '';
    }

    if (normalized.length <= SUMMARY_CHAR_LIMIT) {
      return normalized;
    }
    //📌 상세소개 요약하는 서비스
    const summarized = await this.novaService.summarizeDescription(normalized);
    const cleaned = this.normalizeWhitespace(summarized);

    return cleaned;
  }

  private normalizeWhitespace(text?: string): string {
    if (!text) {
      return '';
    }
    return text.replace(/\s+/g, ' ').trim();
  }
}
