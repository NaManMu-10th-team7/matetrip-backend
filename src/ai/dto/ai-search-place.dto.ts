/**
 * AI 에이전트가 장소 검색 시 반환하는 장소 데이터 인터페이스
 */
export interface AiSearchPlaceDto {
  id: string; // places 테이블의 ID
  name: string;
  address: string;
  longitude: number;
  latitude: number;
}
