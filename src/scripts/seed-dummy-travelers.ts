import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../domain/users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../domain/users/entities/users.entity';
import { Profile } from '../domain/profile/entities/profile.entity';
import { Post } from '../domain/post/entities/post.entity';
import { TitanEmbeddingService } from '../ai/titan-embedding.service';
import { NovaService } from '../ai/summaryLLM.service';
import { TravelStyleType } from '../domain/profile/entities/travel-style-type.enum';
import { TendencyType } from '../domain/profile/entities/tendency-type.enum';
import { MBTI_TYPES } from '../domain/profile/entities/mbti.enum';
import { GENDER } from '../domain/profile/entities/gender.enum';
import { KeywordType } from '../domain/post/entities/keywords-type.enum';
import { PostStatus } from '../domain/post/entities/post-status.enum';

interface SeedProfileInput {
  nickname: string;
  gender: GENDER;
  intro: string;
  description: string;
  travelStyles: TravelStyleType[];
  tendency: TendencyType[];
  mbtiTypes: MBTI_TYPES;
}

interface SeedPostInput {
  title: string;
  content: string;
  location: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  keywords: KeywordType[];
  status?: PostStatus;
}

interface SeedUserInput {
  email: string;
  password: string;
  profile: SeedProfileInput;
  post: SeedPostInput;
}

const seedUsers: SeedUserInput[] = [
  {
    email: 'seona.solowalker@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '조용한트레커',
      gender: GENDER.FEMALE,
      intro: '산책과 필름카메라를 좋아하는 UX 디자이너',
      description: [
        '서울 성수동에서 일상을 보내지만 주말이면 산책 가능한 도시로 훌쩍 떠납니다.',
        '새로운 목적지를 가면 가장 먼저 동네 서점을 둘러보고 조용한 카페를 찾아요.',
        '일정을 촘촘하게 세우기보다는 오전에 한 번, 오후에 한 번 정도 메인 활동을 배치합니다.',
        '함께 걷는 시간이 길어도 불편하지 않은 내향적인 동행을 선호합니다.',
        '사진을 찍을 때는 서로 기다려줄 수 있는 배려심 많은 분이면 좋겠어요.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.METICULOUS,
        TravelStyleType.HEALING,
        TravelStyleType.INDEPENDENT,
      ],
      tendency: [
        TendencyType.MOUNTAIN,
        TendencyType.TREKKING,
        TendencyType.CAFE_DESSERT,
        TendencyType.QUIET_RELAXATION,
      ],
      mbtiTypes: MBTI_TYPES.INFJ,
    },
    post: {
      title: '강릉 조용한 카페 투어 & 해돋이 러닝',
      content: [
        '11월 중순 강릉에서 일출 러닝과 조용한 카페 탐방할 동행 구합니다.',
        '새벽 러닝 후에는 카페에서 독서하며 쉬고, 오후에는 서점과 소품샵을 둘러볼 예정이에요.',
        '소수 인원으로 여유롭게 움직이고, 사진 찍는 시간 충분히 드릴게요.',
      ].join('\n'),
      location: '강릉',
      startDate: '2024-11-16',
      endDate: '2024-11-18',
      maxParticipants: 3,
      keywords: [
        KeywordType.CAFE_PHOTO,
        KeywordType.NATURE_VIBE,
        KeywordType.PACE_CHILL,
        KeywordType.SMALL_CHILL_CREW,
      ],
    },
  },
  {
    email: 'jihun.depthnotes@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '북유럽감성',
      gender: GENDER.MALE,
      intro: '핀란드 인테리어를 좋아하는 개발자',
      description: [
        '일과가 끝나면 주로 집에서 음악을 듣거나 북디자인을 스크랩합니다.',
        '도시 여행을 가면 전체 분위기를 느끼기 위해 느긋하게 걷는 편이에요.',
        '미술관과 건축 투어를 반드시 포함시키고, 카페는 하루 한 곳만 방문합니다.',
        '과한 스케줄보다 충분한 휴식과 대화가 있는 동행을 선호합니다.',
        '사진에 색감을 맞추는 것을 좋아해 비 오는 날의 감성도 환영입니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.INTROVERTED,
        TravelStyleType.RELAXED,
        TravelStyleType.ROMANTIC,
      ],
      tendency: [
        TendencyType.CITY,
        TendencyType.MUSEUM,
        TendencyType.GALLERY,
        TendencyType.CAFE_DESSERT,
      ],
      mbtiTypes: MBTI_TYPES.INTJ,
    },
    post: {
      title: '교토 가을 건축 산책 인원 모집',
      content: [
        '교토에서 근대 건축 투어와 전통 카페를 돌아볼 동행 2명 구합니다.',
        '아침에는 시장에서 간단히 식사하고, 낮에는 건축물과 미술관 위주로 움직여요.',
        '저녁에는 가모가와 근처에서 야경 감상하면서 하루를 정리하려고 합니다.',
      ].join('\n'),
      location: '일본 교토',
      startDate: '2024-11-21',
      endDate: '2024-11-25',
      maxParticipants: 3,
      keywords: [
        KeywordType.CULTURE_FESTIVAL,
        KeywordType.CAFE_PHOTO,
        KeywordType.PACE_CHILL,
        KeywordType.SMALL_CHILL_CREW,
      ],
    },
  },
  {
    email: 'yuna.deepfocus@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '필름스케치',
      gender: GENDER.FEMALE,
      intro: '조용한 바닷가와 필름사진이 삶의 활력',
      description: [
        '사람이 붐비지 않는 시간에 바닷가를 걷는 것을 최고의 휴식으로 생각합니다.',
        '여행 중에는 아침에 일찍 일어나 개인 루틴을 지킨 뒤 동행을 만나요.',
        '카페와 서점을 중심으로 하루 일정을 설계하고 틈틈이 글을 씁니다.',
        '동행과는 하루에 한 번 정도 깊은 대화를 나누면 충분하다고 느껴요.',
        '야간에는 숙소에서 독서를 하거나 필름을 정리하며 시간을 보냅니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.HEALING,
        TravelStyleType.METICULOUS,
        TravelStyleType.INTROVERTED,
      ],
      tendency: [
        TendencyType.BEACH,
        TendencyType.CAFE_DESSERT,
        TendencyType.QUIET_RELAXATION,
        TendencyType.LEISURELY_SCHEDULE,
      ],
      mbtiTypes: MBTI_TYPES.ISFP,
    },
    post: {
      title: '제주 동부 조용한 힐링 드라이브',
      content: [
        '사람 적은 동부 해안 도로를 따라 카페와 북스테이를 방문하려고 합니다.',
        '일출은 세화 해변에서 보고, 오후에는 밭 사이를 걷는 산책 코스를 넣었어요.',
        '운전 가능하고 조용한 동행 1~2명 정도면 충분합니다.',
      ].join('\n'),
      location: '제주 동부',
      startDate: '2024-11-12',
      endDate: '2024-11-14',
      maxParticipants: 2,
      keywords: [
        KeywordType.BEACH_RESORT,
        KeywordType.NATURE_VIBE,
        KeywordType.PACE_CHILL,
        KeywordType.BUDGET_FRIENDLY_TRIP,
      ],
    },
  },
  {
    email: 'dohyuk.mapreader@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '지도연구가',
      gender: GENDER.MALE,
      intro: '계획형 ISTJ 여행자',
      description: [
        '10년째 지도를 모으고 있고, 새 도시를 방문하면 직접 도보 동선을 설계합니다.',
        '여행 동행과는 전날 일정을 공유하고 의견을 맞춘 뒤 이동해요.',
        '역사와 건축 이야기를 좋아하지만 필요 이상으로 말을 많이 하진 않습니다.',
        '시간 약속을 철저히 지키는 편이라 비슷한 스타일의 동행을 선호합니다.',
        '사진은 기록용으로 남기고, 하루를 마치면 간단히 일지로 정리합니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.METICULOUS,
        TravelStyleType.EFFICIENT,
        TravelStyleType.INDEPENDENT,
      ],
      tendency: [
        TendencyType.HERITAGE_TOUR,
        TendencyType.CITY,
        TendencyType.PUBLIC_TRANSPORT,
        TendencyType.PACKED_SCHEDULE,
      ],
      mbtiTypes: MBTI_TYPES.ISTJ,
    },
    post: {
      title: '경주 사적지 심화 투어',
      content: [
        '경주 핵심 사적지를 이틀 동안 도보와 대중교통으로 천천히 돌아보려 합니다.',
        '유적지 해설과 기록 남기기에 관심 있는 분이면 좋겠어요.',
        '하루 마무리는 황리단길 조용한 카페에서 정리할 예정입니다.',
      ].join('\n'),
      location: '경주',
      startDate: '2024-11-30',
      endDate: '2024-12-01',
      maxParticipants: 4,
      keywords: [
        KeywordType.CULTURE_FESTIVAL,
        KeywordType.PACE_TIGHT,
        KeywordType.SMALL_CHILL_CREW,
        KeywordType.BUDGET_FRIENDLY_TRIP,
      ],
    },
  },
  {
    email: 'sumin.silentwaves@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '물결수집가',
      gender: GENDER.FEMALE,
      intro: 'INTP 여행기록자',
      description: [
        '바다 파도 소리를 녹음해 음향 일기를 만드는 취미가 있습니다.',
        '낮에는 활동을 최소화하고, 해가 지면 산책하며 생각을 정리해요.',
        '섬 여행을 할 때는 이동 시간을 충분히 확보하고 즉흥적인 계획 변경을 즐깁니다.',
        '동행과는 하루 마무리 시간에 편하게 대화하는 정도가 좋습니다.',
        '새로운 관측을 정리해 블로그에 기록하기 때문에 메모 시간이 필요합니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.SPONTANEOUS,
        TravelStyleType.RELAXED,
        TravelStyleType.INTROVERTED,
      ],
      tendency: [
        TendencyType.ISLAND,
        TendencyType.NIGHT_VIEW,
        TendencyType.QUIET_RELAXATION,
        TendencyType.LEISURELY_SCHEDULE,
      ],
      mbtiTypes: MBTI_TYPES.INTP,
    },
    post: {
      title: '완도 별보기 & 야간 산책 모임',
      content: [
        '완도 느리게 걷기, 야간별 관측, 파도 녹음까지 함께할 동행을 찾아요.',
        '낮에는 충분히 쉬고, 해질녘부터 이동하는 일정입니다.',
        '과묵해도 괜찮고, 서로의 시간을 존중해 주는 분이면 환영입니다.',
      ].join('\n'),
      location: '전남 완도',
      startDate: '2024-12-05',
      endDate: '2024-12-07',
      maxParticipants: 3,
      keywords: [
        KeywordType.NATURE_VIBE,
        KeywordType.PACE_CHILL,
        KeywordType.SMALL_CHILL_CREW,
        KeywordType.COMFORT_HEALING_TRIP,
      ],
    },
  },
  {
    email: 'haru.sunnyplanner@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '활력비타민',
      gender: GENDER.FEMALE,
      intro: '행사를 기획하는 ENFP 플래너',
      description: [
        '새로운 도시를 만나면 현지 친구를 사귀고 이야기를 나누는 것을 좋아합니다.',
        '낮에는 액티비티로 에너지를 쓰고 저녁에는 재즈바나 로컬 펍에서 네트워킹을 해요.',
        '일정은 느슨하지만 아이디어가 떠오르면 즉시 실행하는 편입니다.',
        '동행이 편안하게 의견을 낼 수 있는 분위기를 만드는 것이 중요하다고 생각합니다.',
        '추억을 기록하기 위해 즉석 필름과 브이로그를 동시에 남깁니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.EXTROVERTED,
        TravelStyleType.SPONTANEOUS,
        TravelStyleType.ACTIVE,
      ],
      tendency: [
        TendencyType.CITY,
        TendencyType.NIGHT_MARKET,
        TendencyType.CONCERT,
        TendencyType.FOODIE_TOUR,
      ],
      mbtiTypes: MBTI_TYPES.ENFP,
    },
    post: {
      title: '방콕 야시장 & 재즈바 투어',
      content: [
        '방콕의 활기찬 야시장과 재즈바를 함께 돌면서 영상 기록할 멤버를 구합니다.',
        '낮에는 마사지와 카페, 저녁 이후에는 야시장과 라이브 재즈바 일정이에요.',
        '새로운 사람과 금방 친해지는 편이라 외향적인 동행이면 더 좋아요.',
      ].join('\n'),
      location: '태국 방콕',
      startDate: '2024-11-28',
      endDate: '2024-12-02',
      maxParticipants: 4,
      keywords: [
        KeywordType.CITY_NIGHT_VIBE,
        KeywordType.ACTIVE_SOCIAL_CREW,
        KeywordType.CAFE_PHOTO,
        KeywordType.PACE_CHILL,
      ],
    },
  },
  {
    email: 'minjun.vibehost@example.com',
    password: 'MateTrip123!',
    profile: {
      nickname: '분위기메이커',
      gender: GENDER.MALE,
      intro: 'ESFP 파티 메이커',
      description: [
        '주말마다 친구들을 모아 캠프파이어 파티를 여는 걸 즐깁니다.',
        '여행지에서도 현지인과 빠르게 친해져 숨은 명소를 찾아요.',
        '액티비티 후에는 모두가 즐길 수 있는 음악을 틀어 분위기를 만듭니다.',
        '동행이 말이 없더라도 먼저 다가가 편하게 만들 자신이 있어요.',
        '사진과 영상으로 추억을 남기고 틱톡으로 하이라이트를 공유합니다.',
      ].join('\n'),
      travelStyles: [
        TravelStyleType.EXTROVERTED,
        TravelStyleType.ACTIVE,
        TravelStyleType.SOCIABLE,
      ],
      tendency: [
        TendencyType.CAMPING,
        TendencyType.CYCLING,
        TendencyType.LOCAL_FESTIVAL,
        TendencyType.TALKATIVE_COMPANION_PREFERRED,
      ],
      mbtiTypes: MBTI_TYPES.ESFP,
    },
    post: {
      title: '가평 글램핑 & 라이브 세션',
      content: [
        '가평에서 글램핑하며 낮에는 자전거 라이딩, 밤에는 음악 세션을 할 멤버를 찾습니다.',
        '바비큐 후에는 기타와 미니 드럼을 챙겨와 즉흥 라이브를 즐길 예정이에요.',
        '활발하게 소통하면서 서로의 취향 플레이리스트를 공유해요.',
      ].join('\n'),
      location: '경기 가평',
      startDate: '2024-11-23',
      endDate: '2024-11-24',
      maxParticipants: 6,
      keywords: [
        KeywordType.ACTIVE_SOCIAL_CREW,
        KeywordType.LIGHT_OUTDOOR,
        KeywordType.COMFORT_HEALING_TRIP,
        KeywordType.PACE_CHILL,
      ],
    },
  },
];

async function seedDummyTravelers() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const usersService = app.get(UsersService);
  const userRepository = app.get<Repository<Users>>(getRepositoryToken(Users));
  const profileRepository = app.get<Repository<Profile>>(
    getRepositoryToken(Profile),
  );
  const postRepository = app.get<Repository<Post>>(getRepositoryToken(Post));
  const titanEmbeddingService = app.get(TitanEmbeddingService);
  const novaService = app.get(NovaService);

  try {
    for (const seed of seedUsers) {
      const existing = await userRepository.findOne({
        where: { email: seed.email },
        relations: ['profile'],
      });
      if (existing) {
        console.log(`[skip] ${seed.email} already exists`);
        continue;
      }

      await usersService.create({
        email: seed.email,
        password: seed.password,
        profile: seed.profile,
      });

      const createdUser = await userRepository.findOne({
        where: { email: seed.email },
        relations: ['profile'],
      });

      if (!createdUser || !createdUser.profile) {
        console.warn(`[warn] profile not found for ${seed.email}`);
        continue;
      }

      const summary = await novaService.summarizeDescription(
        seed.profile.description,
      );
      const embedding = await titanEmbeddingService.embedText(
        summary || seed.profile.description,
      );
      if (!embedding) {
        console.warn(`[warn] embedding failed for ${seed.email}`);
      } else {
        createdUser.profile.profileEmbedding = embedding;
        await profileRepository.save(createdUser.profile);
      }

      const postEntity = postRepository.create({
        ...seed.post,
        status: seed.post.status ?? PostStatus.RECRUITING,
        writer: createdUser,
      });
      await postRepository.save(postEntity);

      console.log(`[ok] Seeded user/post for ${seed.email}`);
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

void seedDummyTravelers()
  .then(() => {
    console.log('Dummy traveler seeding completed.');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
