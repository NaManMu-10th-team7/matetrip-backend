-- INSERT INTO users (
--   email,
--   hashed_password
-- )
-- VALUE 
--   ('user01@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user02@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user03@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user04@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user05@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user06@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user07@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user08@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user09@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')
--   ('user10@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK')

-- INSERT INTO profile (
--   user_id,
--   nickname,
--   gender,
--   intro,
--   description,
--   mbti,
--   is_pass_auth
-- )
-- SELECT
--   u.id,
--   u.email || '_profile',
--   '남성'::gender,
--   (ARRAY[
--     '저랑 같이 1박2일 맛집 투어 가실 분 모집합니다!',
--     '우리 함께 여행해요',
--     '함께 여행계획 세우실 분!',
--     '지구 ㅈl존 최강🔥',
--     '좋은사람 좋은인연..⭐️',
--     '남ㅈr는 울zlㅇrㄴr....🌈'
--   ])[floor(random() * 6 + 1)],
--   (ARRAY[
--     '안녕하세요 저는 경기도 용인에 살고있는 이요한 이라고합니다. 저는 백엔드 천재이구요. 데이터베이스를 아주 잘 다뤄요. 그중 PostgreSQL을 참 좋아합니다. 넘무넘무 섹시해요. 저와 함께 소통해요! 하지만 하나는 잊지마세요. 여행 또한 This is Competition',
--     '안녕하세요 저는 경기도 용인에 살고있는 풀스택 개발자 표후동입니다. 저는 우선 떡볶이를 좋아하고 조용하고 한적한 음악이 깃들어 있는 장소를 좋아합니다. ',
--     '안녕하세요 저는 서울시 중랑구에 사는 게임개발자 정지훈 입니다. 게임에 관심이 있으신 분들 소통해요!!',
--     '안녕하세요 저는 대전시에 살고있는 박준성입니다. 무엇을 하든 함께 하는것을 좋아합니다. 소통하며 지내요!',
--     '안녕하세요 저는 서울시에 살고있는 박시현입니다. 저는 컴퓨터공학과에 재학중인 학생입니다. 마랑탕, 떡볶이, 먹는것은 다 좋아합니다. 저와 함께 맛있는것 먹으러가요!',
--     '안녕하세요 저는 일산에 거주하는 유성수라고 합니다. 이번에 대학교를 졸업하고 여행을 좀 다니려고하는데 좋은 서비스가 있다하여 가입하게되었습니다. 언제든 좋으니 조율후에 함께 여행을 떠나요!'
--   ])[floor(random() * 6 + 1)],
--   (ARRAY[
--     'INFP'::mbti_type,
--     'ENFP'::mbti_type,
--     'INTJ'::mbti_type,
--     'ENTP'::mbti_type,
--     'ISFJ'::mbti_type,
--     'ESFP'::mbti_type
--   ])[floor(random() * 6 + 1)],
--   true
-- FROM users u
-- where not exists(
--     select 1 from profile p where p.user_id = u.id
-- )
-- LIMIT 6;

-- INSERT INTO post (
--   writer_id,
--   title,
--   content,
--   location
-- )
-- SELECT 
--   u.id,
--   (ARRAY[
--     '함께 이번 겨울 휴가로 국내여행 가실 분 모집합니다.',
--     '1박2일 조용하고 한적한 곳 여행 가실 분 모집합니다.',
--     '게임 페스티벌 참석할 게임에 관심있으신 분 모집합니다.',
--     '함께 대방어 먹으러 가실 분 모집합니다.',
--     '성수동 예쁜 카페도 가고 같이 쇼핑도 하실 분!',
--     '2박3일 함께 하실분 모집합니다!!'
--   ])[floor(random() * 6 + 1)],
--   (ARRAY[
--     '안녕하세요! 이번 겨울 휴가 시즌에 함께 국내여행 떠나실 분들을 모집합니다. 12월 말부터 1월 초까지 약 4박 5일 정도로 계획하고 있어요. 눈 내리는 강원도나 제주도를 생각하고 있는데, 함께 가실 분들의 의견을 들어서 최종 결정하려고 합니다. 저는 30대 초반 직장인이고, 여행 스타일은 빡빡한 일정보다는 여유롭게 현지 분위기를 즐기는 편입니다. 아침에 늦게 일어나서 브런치 먹고, 오후에 근처 명소 둘러보고, 저녁에는 맛있는 것 먹으면서 이야기 나누는 그런 여행 좋아하세요! 렌터카는 제가 운전할 수 있고, 숙소는 게스트하우스나 펜션으로 생각하고 있어요. 혼자 여행도 좋지만 함께 가면 더 즐거운 추억을 만들 수 있을 것 같아서 이렇게 글 올립니다. 편하게 연락주세요!',
--     '안녕하세요. 주말에 1박 2일로 조용하고 한적한 곳으로 힐링 여행을 떠나고 싶어서 동행을 구합니다. 요즘 일이 너무 바빠서 스트레스가 쌓였는데, 복잡한 관광지보다는 사람 적고 자연 경치가 좋은 곳에서 쉬고 싶어요. 생각하고 있는 곳은 강원도 양양이나 홍천, 또는 경북 울진 쪽입니다. 바닷가나 산속 작은 마을에서 천천히 산책하고, 맛있는 로컬 음식 먹고, 저녁에는 숙소에서 편하게 이야기 나누면서 쉬는 그런 여행을 생각하고 있습니다. 저는 20대 후반 여성이고, 조용한 성격이라 시끄러운 분위기보다는 차분한 여행을 선호해요. 사진 찍는 것도 좋아하는데, SNS용 인생샷보다는 풍경 위주로 찍는 편입니다. 비슷한 스타일이신 분들과 함께 힐링하고 싶습니다. 1인당 예산은 숙박비와 식비 포함해서 15만원 정도 생각하고 있어요. 관심 있으신 분들은 댓글이나 메시지 주세요!',
--     '게임 좋아하시는 분들 주목! 다음 달에 킨텍스에서 열리는 게임 페스티벌에 함께 가실 분들을 찾고 있습니다. 올해는 특히 기대되는 신작 게임들이 많이 전시된다고 해서 꼭 가보고 싶었는데, 혼자 가기엔 좀 심심할 것 같아서 이렇게 글 올립니다. RPG, FPS, 인디게임 모두 좋아하고, 특히 이번에 공개되는 신작 RPG의 체험판을 꼭 플레이해보고 싶어요. 페스티벌은 오전 10시부터 저녁 6시까지 진행되는데, 하루 종일 돌아다니면서 여러 부스도 구경하고, 개발자 강연도 들을 계획입니다. 점심은 페스티벌장 근처에서 같이 먹고, 관심사가 비슷한 분들과 게임 이야기 나누면서 즐거운 시간 보내면 좋을 것 같아요. 저는 30대 초반 직장인이고, 주로 PC게임과 콘솔게임을 즐깁니다. 게임 문화에 관심 있으시고 편하게 이야기 나눌 수 있는 분이면 누구나 환영합니다! 입장권은 각자 예매하시고, 당일 현장에서 만나는 걸로 하면 될 것 같아요. 관심 있으신 분들 연락 주세요!',
--     '겨울 별미 대방어 시즌이 돌아왔습니다! 이번 주말에 부산 기장이나 제주도로 대방어 먹으러 가실 분들을 모집해요. 작년에 처음 대방어회를 먹어봤는데 정말 너무 맛있어서 올해도 꼭 가보고 싶었습니다. 대방어는 겨울철에만 맛볼 수 있는 별미라서 이 시기를 놓치면 내년까지 기다려야 하잖아요! 1박 2일로 계획하고 있고, 첫날은 점심에 대방어회 먹고, 오후에는 근처 해안도로 드라이브하면서 경치 구경하고, 저녁에는 횟집에서 대방어 특선 코스 먹을 생각입니다. 숙소는 바다 뷰 펜션으로 예약하려고 해요. 둘째 날은 아침 먹고 현지 전통시장 구경한 다음에 서울로 올라오는 일정입니다. 회를 좋아하시고 특히 제철 음식에 관심 있으신 분들이라면 정말 만족하실 거예요. 대방어는 좀 비싼 편이라 예산은 1인당 교통비, 숙박비, 식비 포함해서 약 30~35만원 정도 예상하고 있습니다. 맛있는 것 먹으러 함께 가실 미식가 분들 연락 주세요!',
--     '안녕하세요! 이번 주말에 성수동 핫플레이스 투어 함께 하실 분 찾아요. 요즘 성수동이 진짜 핫하잖아요. 예쁜 카페도 많고, 독특한 편집샵이랑 빈티지샵도 많고, 맛집도 엄청 많더라고요. 혼자 가려다가 친구가 약속이 취소돼서 갑자기 동행을 구하게 됐어요. 오전 11시쯤 성수역에서 만나서 브런치 카페에서 식사하고, 그 다음에 유명한 디저트 카페 몇 군데 돌면서 케이크나 마카롱 먹고, 오후에는 쇼핑하면서 구경하는 코스로 생각하고 있어요. 특히 레트로 감성의 옷가게랑 소품샵, 독립서점 같은 곳들이 가보고 싶어요. 저녁 때쯤 되면 성수동 유명한 파스타집이나 이탈리안 레스토랑에서 식사하고 마무리하려고 합니다. 저는 20대 중반 여성이고, 카페 투어랑 쇼핑을 좋아해요. 사진도 좋아해서 예쁜 곳 가면 사진 많이 찍는 편입니다. 센스있는 옷이나 소품 구경하는 거 좋아하시고, 힙한 분위기 좋아하시는 분들이라면 정말 즐거운 하루 보내실 수 있을 거예요. 부담없이 연락주세요!',
--     '4박 5일 국내 여행 동행 구합니다! 다음 주 금요일부터 일요일까지 일정으로 여행 계획 중인데, 목적지는 아직 정하지 못했어요. 제주도, 부산, 강릉, 여수 중에서 날씨 보고 결정하려고 합니다. 여행 스타일은 유명 관광지도 가보고, 로컬 맛집도 찾아다니고, 자연 경치 좋은 곳에서 여유롭게 쉬기도 하는 그런 밸런스 잡힌 여행을 선호해요. 너무 빡빡하게 돌아다니는 것도 싫고, 그렇다고 숙소에만 있는 것도 아까우니까 적당히 액티브하게 움직이면서도 휴식도 취하는 일정이면 좋겠어요. 렌터카는 제가 예약할 수 있고 운전도 괜찮은 편입니다. 숙소는 깨끗하고 위치 좋은 곳으로 에어비앤비나 호텔 예약하려고 해요. 예산은 1인당 교통비, 숙박비, 식비 포함해서 40~50만원 선으로 생각하고 있습니다. 저는 30대 중반이고 평범한 회사원이에요. 여행 경험도 많고 적응력도 좋은 편이라 어떤 분들과도 잘 맞을 것 같아요. 나이나 성별 상관없이 여행 매너 좋으시고 긍정적이신 분들이면 환영합니다. 같이 즐거운 추억 만들어요!'
--   ])[floor(random() * 6 + 1)],
--   (ARRAY[
--     '강원도 강릉시',
--     '경기도 연천군',
--     '부산광역시',
--     '강원도 동해시',
--     '서울특별시 성동구',
--     '제주도'
--   ])[floor(random() * 6 + 1)]
-- FROM users u
-- LIMIT 6;

-- 1단계: users 삽입
INSERT INTO users (
  email,
  hashed_password
)
VALUES 
  ('user01@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK'),
  ('user02@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK'),
  ('user03@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK'),
  ('user04@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK'),
  ('user05@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK'),
  ('user06@naver.com', '$2a$12$tJv6LL0buq26DgGvWrTDh.vOGjoJsLOPBfa1bib15HaeL8FGRoFVK');

-- 2단계: profile 삽입 (각 user별로 고정 데이터)
INSERT INTO profile (
  user_id,
  nickname,
  gender,
  intro,
  description,
  mbti,
  is_pass_auth
)
SELECT
  u.id,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '요한'
    WHEN u.email = 'user02@naver.com' THEN '후동'
    WHEN u.email = 'user03@naver.com' THEN '지훈'
    WHEN u.email = 'user04@naver.com' THEN '준성'
    WHEN u.email = 'user05@naver.com' THEN '시현'
    WHEN u.email = 'user06@naver.com' THEN '성수'
  END,
  CASE
    WHEN u.email = 'user05@naver.comuser05@naver.com' THEN '여성'::gender
    ELSE   '남성'::gender
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '지구 ㅈl존 최강🔥'
    WHEN u.email = 'user02@naver.com' THEN '우리 함께 여행해요'
    WHEN u.email = 'user03@naver.com' THEN '함께 여행계획 세우실 분!'
    WHEN u.email = 'user04@naver.com' THEN '저랑 같이 1박2일 맛집 투어 가실 분 모집합니다!'
    WHEN u.email = 'user05@naver.com' THEN '좋은사람 좋은인연..⭐️'
    WHEN u.email = 'user06@naver.com' THEN '남ㅈr는 울zlㅇrㄴr....🌈'
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '안녕하세요 저는 경기도 용인에 살고있는 이요한 이라고합니다. 저는 백엔드 천재이구요. 데이터베이스를 아주 잘 다뤄요. 그중 PostgreSQL을 참 좋아합니다. 넘무넘무 섹시해요. 저와 함께 소통해요! 하지만 하나는 잊지마세요. 여행 또한 This is Competition'
    WHEN u.email = 'user02@naver.com' THEN '안녕하세요 저는 경기도 용인에 살고있는 풀스택 개발자 표후동입니다. 저는 우선 떡볶이를 좋아하고 조용하고 한적한 음악이 깃들어 있는 장소를 좋아합니다.'
    WHEN u.email = 'user03@naver.com' THEN '안녕하세요 저는 서울시 중랑구에 사는 게임개발자 정지훈 입니다. 게임에 관심이 있으신 분들 소통해요!!'
    WHEN u.email = 'user04@naver.com' THEN '안녕하세요 저는 대전시에 살고있는 박준성입니다. 무엇을 하든 함께 하는것을 좋아합니다. 소통하며 지내요!'
    WHEN u.email = 'user05@naver.com' THEN '안녕하세요 저는 서울시에 살고있는 박시현입니다. 저는 컴퓨터공학과에 재학중인 학생입니다. 마랑탕, 떡볶이, 먹는것은 다 좋아합니다. 저와 함께 맛있는것 먹으러가요!'
    WHEN u.email = 'user06@naver.com' THEN '안녕하세요 저는 일산에 거주하는 유성수라고 합니다. 이번에 대학교를 졸업하고 여행을 좀 다니려고하는데 좋은 서비스가 있다하여 가입하게되었습니다. 언제든 좋으니 조율후에 함께 여행을 떠나요!'
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN 'INFP'::mbti_type
    WHEN u.email = 'user02@naver.com' THEN 'ENFP'::mbti_type
    WHEN u.email = 'user03@naver.com' THEN 'INTJ'::mbti_type
    WHEN u.email = 'user04@naver.com' THEN 'ENTP'::mbti_type
    WHEN u.email = 'user05@naver.com' THEN 'ISFJ'::mbti_type
    WHEN u.email = 'user06@naver.com' THEN 'ESFP'::mbti_type
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN true
    WHEN u.email = 'user03@naver.com' THEN true
    WHEN u.email = 'user05@naver.com' THEN true
    ELSE false
  END
FROM users u
WHERE u.email IN ('user01@naver.com', 'user02@naver.com', 'user03@naver.com',
                   'user04@naver.com', 'user05@naver.com', 'user06@naver.com')
  AND NOT EXISTS(SELECT 1 FROM profile p WHERE p.user_id = u.id);

-- 3단계: post 삽입 (각 user의 거주지와 맞는 여행지)
INSERT INTO post (
  writer_id,
  title,
  content,
  status,
  location,
  start_date,
  end_date
)
SELECT
  u.id,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '함께 이번 겨울 휴가로 국내여행 가실 분 모집합니다.'
    WHEN u.email = 'user02@naver.com' THEN '1박2일 조용하고 한적한 곳 여행 가실 분 모집합니다.'
    WHEN u.email = 'user03@naver.com' THEN '게임 페스티벌 참석할 게임에 관심있으신 분 모집합니다.'
    WHEN u.email = 'user04@naver.com' THEN '함께 대방어 먹으러 가실 분 모집합니다.'
    WHEN u.email = 'user05@naver.com' THEN '성수동 예쁜 카페도 가고 같이 쇼핑도 하실 분!'
    WHEN u.email = 'user06@naver.com' THEN '2박3일 함께 하실분 모집합니다!!'
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '안녕하세요! 이번 겨울 휴가 시즌에 함께 국내여행 떠나실 분들을 모집합니다. 12월 말부터 1월 초까지 약 4박 5일 정도로 계획하고 있어요. 눈 내리는 강원도나 제주도를 생각하고 있는데, 함께 가실 분들의 의견을 들어서 최종 결정하려고 합니다. 저는 30대 초반 직장인이고, 여행 스타일은 빡빡한 일정보다는 여유롭게 현지 분위기를 즐기는 편입니다. 아침에 늦게 일어나서 브런치 먹고, 오후에 근처 명소 둘러보고, 저녁에는 맛있는 것 먹으면서 이야기 나누는 그런 여행 좋아하세요! 렌터카는 제가 운전할 수 있고, 숙소는 게스트하우스나 펜션으로 생각하고 있어요. 혼자 여행도 좋지만 함께 가면 더 즐거운 추억을 만들 수 있을 것 같아서 이렇게 글 올립니다. 편하게 연락주세요!'
    WHEN u.email = 'user02@naver.com' THEN '안녕하세요. 주말에 1박 2일로 조용하고 한적한 곳으로 힐링 여행을 떠나고 싶어서 동행을 구합니다. 요즘 일이 너무 바빠서 스트레스가 쌓였는데, 복잡한 관광지보다는 사람 적고 자연 경치가 좋은 곳에서 쉬고 싶어요. 생각하고 있는 곳은 강원도 양양이나 홍천, 또는 경북 울진 쪽입니다. 바닷가나 산속 작은 마을에서 천천히 산책하고, 맛있는 로컬 음식 먹고, 저녁에는 숙소에서 편하게 이야기 나누면서 쉬는 그런 여행을 생각하고 있습니다. 저는 20대 후반 여성이고, 조용한 성격이라 시끄러운 분위기보다는 차분한 여행을 선호해요. 사진 찍는 것도 좋아하는데, SNS용 인생샷보다는 풍경 위주로 찍는 편입니다. 비슷한 스타일이신 분들과 함께 힐링하고 싶습니다. 1인당 예산은 숙박비와 식비 포함해서 15만원 정도 생각하고 있어요. 관심 있으신 분들은 댓글이나 메시지 주세요!'
    WHEN u.email = 'user03@naver.com' THEN '게임 좋아하시는 분들 주목! 다음 달에 킨텍스에서 열리는 게임 페스티벌에 함께 가실 분들을 찾고 있습니다. 올해는 특히 기대되는 신작 게임들이 많이 전시된다고 해서 꼭 가보고 싶었는데, 혼자 가기엔 좀 심심할 것 같아서 이렇게 글 올립니다. RPG, FPS, 인디게임 모두 좋아하고, 특히 이번에 공개되는 신작 RPG의 체험판을 꼭 플레이해보고 싶어요. 페스티벌은 오전 10시부터 저녁 6시까지 진행되는데, 하루 종일 돌아다니면서 여러 부스도 구경하고, 개발자 강연도 들을 계획입니다. 점심은 페스티벌장 근처에서 같이 먹고, 관심사가 비슷한 분들과 게임 이야기 나누면서 즐거운 시간 보내면 좋을 것 같아요. 저는 30대 초반 직장인이고, 주로 PC게임과 콘솔게임을 즐깁니다. 게임 문화에 관심 있으시고 편하게 이야기 나눌 수 있는 분이면 누구나 환영합니다! 입장권은 각자 예매하시고, 당일 현장에서 만나는 걸로 하면 될 것 같아요. 관심 있으신 분들 연락 주세요!'
    WHEN u.email = 'user04@naver.com' THEN '겨울 별미 대방어 시즌이 돌아왔습니다! 이번 주말에 부산 기장이나 제주도로 대방어 먹으러 가실 분들을 모집해요. 작년에 처음 대방어회를 먹어봤는데 정말 너무 맛있어서 올해도 꼭 가보고 싶었습니다. 대방어는 겨울철에만 맛볼 수 있는 별미라서 이 시기를 놓치면 내년까지 기다려야 하잖아요! 1박 2일로 계획하고 있고, 첫날은 점심에 대방어회 먹고, 오후에는 근처 해안도로 드라이브하면서 경치 구경하고, 저녁에는 횟집에서 대방어 특선 코스 먹을 생각입니다. 숙소는 바다 뷰 펜션으로 예약하려고 해요. 둘째 날은 아침 먹고 현지 전통시장 구경한 다음에 서울로 올라오는 일정입니다. 회를 좋아하시고 특히 제철 음식에 관심 있으신 분들이라면 정말 만족하실 거예요. 대방어는 좀 비싼 편이라 예산은 1인당 교통비, 숙박비, 식비 포함해서 약 30~35만원 정도 예상하고 있습니다. 맛있는 것 먹으러 함께 가실 미식가 분들 연락 주세요!'
    WHEN u.email = 'user05@naver.com' THEN '안녕하세요! 이번 주말에 성수동 핫플레이스 투어 함께 하실 분 찾아요. 요즘 성수동이 진짜 핫하잖아요. 예쁜 카페도 많고, 독특한 편집샵이랑 빈티지샵도 많고, 맛집도 엄청 많더라고요. 혼자 가려다가 친구가 약속이 취소돼서 갑자기 동행을 구하게 됐어요. 오전 11시쯤 성수역에서 만나서 브런치 카페에서 식사하고, 그 다음에 유명한 디저트 카페 몇 군데 돌면서 케이크나 마카롱 먹고, 오후에는 쇼핑하면서 구경하는 코스로 생각하고 있어요. 특히 레트로 감성의 옷가게랑 소품샵, 독립서점 같은 곳들이 가보고 싶어요. 저녁 때쯤 되면 성수동 유명한 파스타집이나 이탈리안 레스토랑에서 식사하고 마무리하려고 합니다. 저는 20대 중반 여성이고, 카페 투어랑 쇼핑을 좋아해요. 사진도 좋아해서 예쁜 곳 가면 사진 많이 찍는 편입니다. 센스있는 옷이나 소품 구경하는 거 좋아하시고, 힙한 분위기 좋아하시는 분들이라면 정말 즐거운 하루 보내실 수 있을 거예요. 부담없이 연락주세요!'
    WHEN u.email = 'user06@naver.com' THEN '4박 5일 국내 여행 동행 구합니다! 다음 주 금요일부터 일요일까지 일정으로 여행 계획 중인데, 목적지는 아직 정하지 못했어요. 제주도, 부산, 강릉, 여수 중에서 날씨 보고 결정하려고 합니다. 여행 스타일은 유명 관광지도 가보고, 로컬 맛집도 찾아다니고, 자연 경치 좋은 곳에서 여유롭게 쉬기도 하는 그런 밸런스 잡힌 여행을 선호해요. 너무 빡빡하게 돌아다니는 것도 싫고, 그렇다고 숙소에만 있는 것도 아까우니까 적당히 액티브하게 움직이면서도 휴식도 취하는 일정이면 좋겠어요. 렌터카는 제가 예약할 수 있고 운전도 괜찮은 편입니다. 숙소는 깨끗하고 위치 좋은 곳으로 에어비앤비나 호텔 예약하려고 해요. 예산은 1인당 교통비, 숙박비, 식비 포함해서 40~50만원 선으로 생각하고 있습니다. 저는 30대 중반이고 평범한 회사원이에요. 여행 경험도 많고 적응력도 좋은 편이라 어떤 분들과도 잘 맞을 것 같아요. 나이나 성별 상관없이 여행 매너 좋으시고 긍정적이신 분들이면 환영합니다. 같이 즐거운 추억 만들어요!'
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '모집중'::post_status
    WHEN u.email = 'user02@naver.com' THEN '모집중'::post_status
    WHEN u.email = 'user03@naver.com' THEN '모집중'::post_status
    WHEN u.email = 'user04@naver.com' THEN '완료'::post_status
    WHEN u.email = 'user05@naver.com' THEN '완료'::post_status
    WHEN u.email = 'user06@naver.com' THEN '모집중'::post_status
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '강원도 강릉시'
    WHEN u.email = 'user02@naver.com' THEN '강원도 동해시'
    WHEN u.email = 'user03@naver.com' THEN '경기도 고양시'
    WHEN u.email = 'user04@naver.com' THEN '부산광역시'
    WHEN u.email = 'user05@naver.com' THEN '서울특별시 성동구'
    WHEN u.email = 'user06@naver.com' THEN '제주도'
  END,
  CASE
    WHEN u.email = 'user01@naver.com' THEN '2025-12-28'::date
    WHEN u.email = 'user02@naver.com' THEN '2025-11-14'::date
    WHEN u.email = 'user03@naver.com' THEN '2025-11-21'::date
    WHEN u.email = 'user04@naver.com' THEN '2025-10-09'::date
    WHEN u.email = 'user05@naver.com' THEN '2025-11-09'::date
    WHEN u.email = 'user06@naver.com' THEN '2025-12-14'::date
  END,
    CASE
    WHEN u.email = 'user01@naver.com' THEN '2026-01-01'::date
    WHEN u.email = 'user02@naver.com' THEN '2025-11-15'::date
    WHEN u.email = 'user03@naver.com' THEN '2025-11-22'::date
    WHEN u.email = 'user04@naver.com' THEN '2025-10-09'::date
    WHEN u.email = 'user05@naver.com' THEN '2025-11-09'::date
    WHEN u.email = 'user06@naver.com' THEN '2025-12-19'::date
  END
FROM users u
WHERE u.email IN ('user01@naver.com', 'user02@naver.com', 'user03@naver.com',
                   'user04@naver.com', 'user05@naver.com', 'user06@naver.com');

INSERT INTO post_participation
