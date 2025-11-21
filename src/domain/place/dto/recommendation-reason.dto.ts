//장소 추천 이유를 담는 DTO
export class RecommendationReasonDto {
  //사용자에게 보여질 추천 이유 메시지
  message: string;

  // 사용자가 과거에 관심을 보였던 유사 장소 정보
  referencePlace: {
    id: string;
    title: string;
  };

  constructor(referencePlace: { id: string; title: string }) {
    this.referencePlace = referencePlace;
    this.message = this.generateMessage(referencePlace.title);
  }

  /**
   * 추천 이유 메시지를 생성합니다.
   * 다양한 문구 패턴을 랜덤하게 사용하여 자연스러운 추천 경험을 제공합니다.
   */
  private generateMessage(placeTitle: string): string {
    const patterns = [
      `${placeTitle}와(과) 비슷한 분위기의 장소예요`,
      `${placeTitle}을(를) 좋아하신다면 이곳도 마음에 드실 거예요`,
      `${placeTitle}처럼 매력적인 곳이에요`,
      `${placeTitle}에 관심 있으시다면 추천드려요`,
      `${placeTitle}와(과) 함께 둘러보면 좋을 장소예요`,
    ];

    // 랜덤 패턴 선택
    const randomIndex = Math.floor(Math.random() * patterns.length);
    return patterns[randomIndex];
  }
}
