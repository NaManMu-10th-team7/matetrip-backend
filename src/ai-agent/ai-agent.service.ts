import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AiAgentService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_API_KEY is not set in the environment variables.',
      );
    }

    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * 기본적인 챗봇 기능
   * @param prompt 사용자에게 입력받은 문자열
   * @returns Gemini의 답변 문자열
   */
  async generateResponse(prompt: string): Promise<string | undefined> {
    try {
      // 사용할 모델에 프롬프트를 보내고 결과를 받음
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      // 텍스트 응답 반환
      return response.text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('AI 응답 생성에 실패했습니다.');
    }
  }
}
