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
    this.message = `${referencePlace.title}을(를) 좋아하시는 분들이 관심 가질만한 곳이에요`;
  }
}
