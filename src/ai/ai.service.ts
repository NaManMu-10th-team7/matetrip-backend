import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  constructor(private readonly httpService: HttpService) {}

  // FastAPI AI 서버 주소
  private readonly aiApiBaseUrl = 'http://localhost:8000';

  async getAgentResponse(query: string, sessionId: string) {
    const url = `${this.aiApiBaseUrl}/invoke`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, { query, session_id: sessionId }),
      );

      console.log(response);

      return response.data;
    } catch (error) {
      console.error('Error calling AI service (Agent):', error.response?.data);
      throw new Error('AI service request failed');
    }
  }
}
