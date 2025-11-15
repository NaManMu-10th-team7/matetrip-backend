import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { AiAgentResponseDto } from './dto/ai-response.dto.js';

@Injectable()
export class AiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAgentResponse(
    query: string,
    sessionId: string,
  ): Promise<AiAgentResponseDto> {
    const url = `${this.configService.get<string>('AI_API_SERVER_URL')}/chat`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<AiAgentResponseDto>(url, {
          query,
          session_id: sessionId,
        }),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          'Error calling AI service (Agent):',
          error.response?.data,
        );
      } else {
        console.error('Error calling AI service (Agent):', error);
      }
      throw new Error('AI service request failed');
    }
  }

  async generatePlan(places: any[], totalDays: number) {
    const fastApiUrl = this.configService.get<string>('AI_API_SERVER_URL');

    const payload = {
      places: places,
      total_date: totalDays,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(`${fastApiUrl}/plan/generate`, payload),
      );

      return response.data;
    } catch (error) {
      console.error('FastAPI /plan/generate 호출 에러', error.message);
      throw new Error('AI 계획 생성 실패');
    }
  }
}
