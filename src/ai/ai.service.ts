import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAgentResponse(query: string, sessionId: string) {
    const url = `${this.configService.get<string>('AI_API_SERVER_URL')}/chat`;

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
