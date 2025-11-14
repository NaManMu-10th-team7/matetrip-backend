export interface KakaoDocument {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  x: string; // API는 문자열로 줌
  y: string;
  place_url: string;
  category_name: string;
}

export interface KakaoResponse {
  documents: KakaoDocument[];
}
