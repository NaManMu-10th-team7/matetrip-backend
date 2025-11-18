import { AiToolDataDto } from './ai-tool-data.dto.js';

export interface AiAgentResponseDto {
  response: string;
  tool_data?: AiToolDataDto[];
}
