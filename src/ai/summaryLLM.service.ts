import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

// 단일 텍스트 파트를 표현 (Gemini API는 role/parts 구조를 요구)
interface GeminiRequestPart {
  text: string;
}

// role + parts 세트를 묶어 하나의 대화 turn을 나타낸다.
interface GeminiRequestContent {
  role: string;
  parts: GeminiRequestPart[];
}

// Gemini GenerateContent 호출에 전달되는 전체 payload
interface GeminiRequest {
  contents: GeminiRequestContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
  };
}

// Gemini 응답 내 텍스트 파트
interface GeminiResponsePart {
  text?: string;
}

// 응답의 content 래퍼
interface GeminiResponseContent {
  parts?: GeminiResponsePart[];
}

// 후보 응답 단위
interface GeminiCandidate {
  content?: GeminiResponseContent;
}

// 전체 Gemini 응답
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// 요약 동작을 조절할 수 있는 옵션 세트
interface SummarizeOptions {
  maxLength?: number;
  language?: string;
  temperature?: number;
  timeout?: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured');
    }
  }

  /**
   * 텍스트 요약 (기본 메서드)
   */
  async summarizeDescription(description: string): Promise<string> {
    // 1-2줄 요약을 위해 maxLength: 2로 설정
    return this.summarize(description, {
      maxLength: 2,
      language: '한국어',
    });
  }

  /**
   * 범용 텍스트 요약 메서드
   */
  async summarize(
    text: string,
    options: SummarizeOptions = {},
  ): Promise<string> {
    if (!text?.trim()) return '';
    if (!this.apiKey) {
      this.logger.error('Gemini API key is not configured');
      return '';
    }

    const {
      maxLength = 2,
      language = '한국어',
      temperature = 0.7, //답변 랜덤성
      timeout = 5000,
    } = options;

    // *** 변경점 2: 프롬프트를 조금 더 명확하게 수정 ***
    const prompt = `다음 텍스트를 ${language}로 ${maxLength}줄 이내로 요약해줘. 핵심 내용만 간결하게.

---
${text}
---`;

    const body: GeminiRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 1024, // 조금 여유 있게 설정
        topK: 40,
        topP: 0.95,
      },
    };

    try {
      const requestConfig: AxiosRequestConfig<GeminiRequest> = {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      };

      // *** 변경점 3: API 키를 URL 파라미터로 전달 (권장 방식) ***
      const url = `${this.baseUrl}/gemini-1.5-flash-latest:generateContent?key=${this.apiKey}`;

      // *** 변경점 4: POST 요청의 제네릭 타입을 간소화 ***
      // T = 응답 데이터 타입 (GeminiResponse)
      // R = 전체 응답 객체 타입 (AxiosResponse<GeminiResponse>)
      // D = 요청 데이터 타입 (GeminiRequest)
      //await: 동기로 처리함
      const response = await this.http.axiosRef.post<
        GeminiResponse,
        AxiosResponse<GeminiResponse>,
        GeminiRequest
      >(url, body, requestConfig);

      // (기존 코드와 동일)
      const result =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      //여러 개의 답변 후보를 생성 ,대체 응답을 보낼 수 있도록 확장성을 고려해 배열로 설계되었는데
      // 이 경우에는 응답이 하나만 필요함. 첫번째 답변만 받아옴(사실 이 경우, 첫번째 응답밖에 없음)
      //?? : 첫 번째 파트에서 텍스트를 꺼내오고 없으면 빈 문자열을 반환하는 방어 코드

      if (!result) {
        this.logger.warn('No text content in Gemini response', response.data);
        return '';
      }

      return result; // 요약본 반환
    } catch (error: unknown) {
      this.handleError(error);
      return ''; // 에러 발생 시 빈 문자열 반환
    }
  }

  /**
   * *** 변경점 5: 타입-안전한 에러 핸들링 (핵심) ***
   */
  private handleError(error: unknown): void {
    // 1. Axios 에러인지 타입 가드로 확인
    if (axios.isAxiosError<GeminiResponse, GeminiRequest>(error)) {
      // 이 블록 안에서 `error`는 `AxiosError` 타입으로 안전하게 추론됩니다.
      const status = error.response?.status;
      const data: GeminiResponse | undefined = error.response?.data;
      const message = error.message;

      if (status === 429) {
        this.logger.warn('Gemini API rate limit exceeded (429).');
      } else if (status === 400) {
        this.logger.error('Gemini API bad request (400):', data);
      } else if (status === 403) {
        this.logger.error(
          'Gemini API authentication failed (403) - Check API Key.',
        );
      } else {
        this.logger.error(`Gemini API error (${status}): ${message}`, data);
      }
    } else if (error instanceof Error) {
      this.logger.error(`Non-Axios error: ${error.message}`, error.stack);
    } else {
      this.logger.error('An unknown error occurred', error);
    }
  }
}
