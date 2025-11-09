import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { PostService } from 'src/domain/post/post.service';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import z from 'zod/v3';
import { HumanMessage } from '@langchain/core/messages';
import { SearchPostDto } from 'src/domain/post/dto/search-post.dto';
import { PostResponseDto } from 'src/domain/post/dto/post-response.dto';

@Injectable()
export class AiAgentService {
  private genAI: GoogleGenAI;

  constructor(private readonly postService: PostService) {
    // const apiKey = process.env.GOOGLE_API_KEY;
    // if (!apiKey) {
    //   throw new Error(
    //     'GOOGLE_API_KEY is not set in the environment variables.',
    //   );
    // }
    // this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * 기본적인 챗봇 기능
   * 에이전트 기능 추가
   * @param prompt 사용자에게 입력받은 문자열
   * @returns Gemini의 답변 문자열
   */
  async generateResponse(
    prompt: string,
  ): Promise<string | PostResponseDto[] | undefined> {
    try {
      // LangChain용 Gemini 모델 초기화
      const model = new ChatGoogleGenerativeAI({
        model: 'gemini-2.5-flash',
        apiKey: process.env.GOOGLE_API_KEY,
      });

      // AI에게 도구를 알려줌
      const searchPostTool = {
        // AI가 호출할 도구 이름
        name: 'searchPostTool',
        description: '사용자가 요청한 조건에 맞는 게시글들을 찾습니다.',
        // zod를 사용해 도구가 받을 인자(arguments)를 명확히 정의
        schema: z.object({
          startDate: z
            .string()
            .optional()
            .describe('검색할 시작 날짜 (YYYY-MM-DD)'),
          endDate: z
            .string()
            .optional()
            .describe('검색할 종료 날짜 (YYYY-MM-DD)'),
          location: z.string().optional().describe('검색할 장소/도시 이름'),
          title: z
            .string()
            .optional()
            .describe('검색할 게시글의 제목에 포함된 키워드'),
        }),
      };

      // 모델에 도구 바인딩
      const modelWithTools = model.bindTools([searchPostTool]);

      // 사용자 프롬프트 모델에 전달
      const result = await modelWithTools.invoke([new HumanMessage(prompt)]);

      // [분기] AI가 '말' 대신 '도구 사용'을 결정했는지 확인
      if (result.tool_calls && result.tool_calls.length > 0) {
        console.log('AI가 도구 사용 결정:', result.tool_calls);

        const toolCall = result.tool_calls[0];

        // AI가 요청한 도구 이름이 'searchPostTool'인지 확인
        if (toolCall.name === 'searchPostTool') {
          // [실행] AI가 생성한 인자(args)로 실제 NestJS 함수 호출
          const toolResult = await this.postService.searchPosts(
            toolCall.args as SearchPostDto,
          );

          // 도구 실행 결과를 사용자에게 반환
          return toolResult;
        }
      }

      // AI가 도구 사용을 결정하지 않은 경우 (일반 대화)
      // (result.content는 AIMessage 객체이므로 .content로 내용 추출)
      if (typeof result.content === 'string') {
        return result.content;
      } else {
        // (혹시 모를 복잡한 응답 대비)
        return JSON.stringify(result.content);
      }
      //   // 사용할 모델에 프롬프트를 보내고 결과를 받음
      //   const response = await this.genAI.models.generateContent({
      //     model: 'gemini-2.5-flash',
      //     contents: prompt,
      //   });

      //   // 텍스트 응답 반환
      //   return response.text;
    } catch (error) {
      console.error('AI 에이전트 응답 생성 실패:', error);
      throw new Error('AI 응답 생성에 실패했습니다.');
    }
  }
}
