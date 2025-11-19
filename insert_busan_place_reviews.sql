-- 부산 지역 장소에 대한 사용자 리뷰 더미데이터 생성 (평점 3.0 이상)

-- 1. 부산 지역 place_id와 user_id를 활용한 리뷰 생성
-- place_user_review 테이블에 더미 데이터 삽입

INSERT INTO place_user_review (place_id, user_id, content, rating, created_at)
SELECT
    p.id as place_id,
    u.id as user_id,
    CASE
        -- 높은 평점 리뷰 (4.5~5.0)
        WHEN random() < 0.3 THEN
            (ARRAY[
                '정말 멋진 곳이에요! 부산 여행 중 최고의 장소였습니다.',
                '분위기도 좋고 사진 찍기에도 완벽해요. 강력 추천합니다!',
                '가족들과 함께 방문했는데 모두 만족했어요. 다음에 또 오고 싶네요.',
                '부산에서 꼭 가봐야 할 곳! 기대 이상이었습니다.',
                '경치가 정말 아름답고 여유롭게 시간 보내기 좋았어요.',
                '음식도 맛있고 서비스도 친절했습니다. 재방문 의사 100%!',
                '사진으로 보던 것보다 훨씬 좋아요. 인생샷 건졌습니다!',
                '친구들한테 적극 추천했어요. 정말 만족스러운 경험이었습니다.',
                '부산 여행의 하이라이트! 시간 가는 줄 몰랐어요.',
                '깨끗하고 쾌적한 환경에서 즐거운 시간 보냈습니다.'
            ])[floor(random() * 10 + 1)]
        -- 중상 평점 리뷰 (4.0~4.4)
        WHEN random() < 0.6 THEN
            (ARRAY[
                '전체적으로 만족스러웠어요. 부산 여행 코스에 추천합니다.',
                '기대했던 대로 좋았어요. 시간 내서 방문할 가치 있습니다.',
                '사람이 좀 많긴 했지만 그만큼 인기 있는 이유가 있네요.',
                '가격 대비 만족스러운 곳이에요. 추천합니다!',
                '부산의 매력을 느낄 수 있는 좋은 장소예요.',
                '날씨 좋은 날 방문하면 더 좋을 것 같아요. 만족했습니다.',
                '연인, 친구, 가족 모두에게 추천할 만한 곳이에요.',
                '깔끔하고 잘 정돈되어 있어서 좋았어요.',
                '부산 와서 여기 안 가면 후회할 듯! 좋았습니다.',
                '다음에도 부산 오면 또 들를 것 같아요.'
            ])[floor(random() * 10 + 1)]
        -- 중간 평점 리뷰 (3.0~3.9)
        ELSE
            (ARRAY[
                '나쁘지 않았어요. 한 번쯤 방문해볼 만한 곳입니다.',
                '기대했던 것보다는 평범했지만 그래도 괜찮았어요.',
                '사람이 많아서 좀 복잡했지만 볼만했습니다.',
                '가격 대비 적당한 곳이에요. 무난하게 다녀왔습니다.',
                '특별한 건 없지만 시간 보내기에는 좋아요.',
                '평범했지만 나름 즐거운 시간이었습니다.',
                '주말에는 사람이 너무 많아요. 평일에 가는 걸 추천합니다.',
                '괜찮은 편이에요. 무난하게 다녀왔습니다.',
                '근처에 가면 한 번쯤 들러볼 만해요.',
                '보통 수준이에요. 그래도 후회하진 않았습니다.'
            ])[floor(random() * 10 + 1)]
    END as content,
    CASE
        WHEN random() < 0.3 THEN
            (4.5 + random() * 0.5)::numeric(2,1)  -- 4.5~5.0
        WHEN random() < 0.6 THEN
            (4.0 + random() * 0.5)::numeric(2,1)  -- 4.0~4.5
        ELSE
            (3.0 + random())::numeric(2,1)  -- 3.0~4.0
    END as rating,
    NOW() - (random() * interval '180 days') as created_at
FROM
    places p
CROSS JOIN
    users u
WHERE
    p.region = '부산'
    AND random() < 0.3  -- 각 장소-유저 조합의 30% 확률로 리뷰 생성
ORDER BY random()
LIMIT 200;  -- 최대 200개의 리뷰 생성

-- 생성된 리뷰 통계 확인
SELECT
    '총 생성된 리뷰 수' as metric,
    COUNT(*)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')

UNION ALL

SELECT
    '평균 평점' as metric,
    ROUND(AVG(rating), 2)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')

UNION ALL

SELECT
    '최고 평점' as metric,
    MAX(rating)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')

UNION ALL

SELECT
    '최저 평점' as metric,
    MIN(rating)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')

UNION ALL

SELECT
    '5점 리뷰 수' as metric,
    COUNT(*)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')
    AND rating = 5.0

UNION ALL

SELECT
    '4점대 리뷰 수' as metric,
    COUNT(*)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')
    AND rating >= 4.0 AND rating < 5.0

UNION ALL

SELECT
    '3점대 리뷰 수' as metric,
    COUNT(*)::text as value
FROM place_user_review
WHERE place_id IN (SELECT id FROM places WHERE region = '부산')
    AND rating >= 3.0 AND rating < 4.0;
