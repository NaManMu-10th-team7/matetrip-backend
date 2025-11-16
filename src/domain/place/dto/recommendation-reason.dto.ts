/**
 * 장소 추천 이유를 담는 DTO
 */
export class RecommendationReasonDto {
  /**
   * 추천 이유 타입
   */
  type: 'similar_to_interested';

  /**
   * 사용자가 과거에 관심을 보였던 유사 장소 정보
   */
  similarPlace: {
    id: string;
    title: string;
  };

  /**
   * 유사도 점수 (0~1)
   */
  similarityScore: number;

  constructor(
    type: 'similar_to_interested',
    similarPlace: { id: string; title: string },
    similarityScore: number,
  ) {
    this.type = type;
    this.similarPlace = similarPlace;
    this.similarityScore = similarityScore;
  }

  /**
   * 사용자에게 보여질 추천 이유 메시지
   */
  getMessage(): string {
    return `당신이 관심 보였던 "${this.similarPlace.title}"와 비슷한 장소입니다`;
  }
}
