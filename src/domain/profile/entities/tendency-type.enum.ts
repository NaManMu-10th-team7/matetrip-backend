export enum TendencyType {
  // 1) CITY (도시·분위기)
  CITY = '도시',
  RURAL = '시골',
  TRADITIONAL_CITY = '전통도시',
  RESORT_CITY = '휴양도시',
  PORT_TOWN = '항구도시',
  ARCHITECTURE_TOUR = '건축물탐방',
  NIGHT_VIEW = '야경감상',
  TRADITIONAL_MARKET = '전통시장',
  SHOPPING = '쇼핑',

  // 2) OUTDOOR (야외·지형·액티비티)
  BEACH = '바다',
  ISLAND = '섬',
  MOUNTAIN = '산',
  VALLEY = '계곡',
  LAKE = '호수',
  FLOWER_VIEWING = '꽃구경',
  TREKKING = '트레킹',
  MOUNTAINEERING = '등산',
  CAMPING = '캠핑',
  CYCLING = '자전거',
  SURFING = '서핑',
  SNORKELING = '스노클링',
  FREEDIVING = '프리다이빙',
  FISHING = '낚시',
  SKIING = '스키',
  SNOWBOARDING = '스노보드',
  GOLF = '골프',

  // 3) CULTURE (문화·예술·체험)
  MUSEUM = '박물관',
  GALLERY = '미술관',
  HERITAGE_TOUR = '유적지탐방',
  MUSICAL_SHOW = '공연뮤지컬',
  CONCERT = '콘서트',
  SPORTS_VIEWING = '스포츠관람',
  AMUSEMENT_PARK = '놀이공원',
  AQUARIUM = '아쿠아리움',
  ZOO = '동물원',
  NIGHT_MARKET = '야시장',
  LOCAL_FESTIVAL = '현지축제',

  // 4) FOOD (미식·음식)
  STREET_FOOD = '길거리음식',
  LOCAL_RESTAURANT = '로컬레스토랑',
  FOODIE_TOUR = '맛집탐방',
  CAFE_DESSERT = '카페디저트',

  // 5) WELLNESS (휴식·웰니스)
  HOTEL_STAYCATION = '호캉스',
  SCENIC_DRIVE = '경치드라이브',
  QUIET_RELAXATION = '조용한휴식',

  // 6) TRANSPORT (교통·이동)
  TRANSPORT_RENTAL_CAR = '렌터카',
  MOTORCYCLE_TRIP = '오토바이여행',
  CAMPER_VAN = '캠핑카',
  PUBLIC_TRANSPORT = '대중교통',
  TRAIN_TRIP = '기차여행',
  RUNNING = '러닝',

  // 7) PLANNING (일정·계획·시기)
  PACKED_SCHEDULE = '빡빡한일정',
  LEISURELY_SCHEDULE = '여유로운일정',

  // 8) ACCOMMODATION (숙박)
  HOTEL = '호텔',
  RESORT = '리조트',
  GUESTHOUSE = '게스트하우스',
  MOTEL = '모텔',
  PENSION = '펜션',
  AIRBNB = '에어비앤비',
  GLAMPING = '글램핑',
  PRIVATE_POOL_VILLA = '풀빌라',

  // 9) FOOD_CONSTRAINTS (음식 제약)
  VEGAN_FRIENDLY = '비건필요',
  NO_PORK = '돼지고기비선호',
  NO_SEAFOOD = '해산물비선호',

  // 10) FOOD_PREFERENCES (음식 선호)
  SPICY_FOOD_PREF = '매운맛선호',
  MILD_FOOD_PREF = '순한맛선호',
  SEAFOOD_PREF = '해산물선호',
  MEAT_PREF = '육류선호',

  // 11) TRAVEL_STYLE (여행 스타일·동반)
  BACKPACKING = '배낭여행',
  CAN_DRIVE = '운전가능',
  PHOTOGRAPHY = '사진촬영',
  LANDSCAPE_PHOTOGRAPHY = '풍경촬영',

  // 12) PERSONAL_TRAITS (개인 성향)
  NON_SMOKER = '비흡연',
  SMOKER = '흡연',
  NON_DRINKING = '비음주',
  DRINKS_ALCOHOL = '음주',

  // 16) SOCIAL_PREFERENCES (동행·사회적 선호)
  SMALL_GROUP_PREFERRED = '소수인원선호',
  QUIET_COMPANION_PREFERRED = '조용한동행선호',
  TALKATIVE_COMPANION_PREFERRED = '수다떠는동행선호',

  // 17) BUDGET_BEHAVIOR (소비·예산 스타일)
  SPEND_ON_FOOD = '음식우선',
  SPEND_ON_LODGING = '숙소우선',
}
