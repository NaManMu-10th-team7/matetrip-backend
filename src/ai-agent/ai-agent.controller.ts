import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('/chat')
  @HttpCode(HttpStatus.OK)
  async handleChat(@Body() createChatDto: CreateChatDto) {
    // DTO에서 메시지 추출
    const userMessage = createChatDto.message;

    // 서비스로 메시지를 넘겨 AI 응답 받음
    const aiResponse = await this.aiAgentService.generateResponse(userMessage);

    // AI 응답을 JSON 형태로 프론트엔드에 반환
    return {
      message: aiResponse,
    };
  }
}
