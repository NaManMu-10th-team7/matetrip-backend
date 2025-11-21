import {
  BedrockRuntimeClient,
  BedrockRuntimeServiceException,
  ConverseCommand,
  ConverseCommandOutput,
  Message,
} from '@aws-sdk/client-bedrock-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// 요약 옵션은 외부 클래스가 그대로 재사용하므로 기존 인터페이스를 유지한다.
interface SummarizeOptions {
  maxLength?: number;
  language?: string;
  temperature?: number;
  timeout?: number;
}

@Injectable()
export class NovaService {
  private readonly logger = new Logger(NovaService.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly defaultMaxTokens: number;
  private readonly validationMaxTokens = 8;

  constructor(private readonly configService: ConfigService) {
    // Bedrock 호출에 필요한 액세스 키와 리전을 전부 환경 변수에서 로드한다.
    const accessKeyId =
      this.configService.get<string>('AWS_LLM_ACCESS_KEY_ID') ?? '';
    const secretAccessKey =
      this.configService.get<string>('AWS_LLM_SECRET_ACCESS_KEY') ?? '';
    const sessionToken =
      this.configService.get<string>('AWS_SESSION_TOKEN') ?? undefined;
    const region =
      this.configService.get<string>('AWS_BEDROCK_REGION') ||
      this.configService.get<string>('AWS_REGION') ||
      'ap-northeast-2'; // 서울 리전을 기본값으로 둬서 베드락 신규 리전에 맞춘다.

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Bedrock credentials are not configured.');
    }

    // AWS SDK v3 클라이언트는 재사용이 권장되므로 생성자에서 단 한 번만 만든다.
    this.client = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });

    // 모델/토큰 수는 환경변수로 오버라이드할 수 있도록 열어 둔다.
    const modelId = this.configService.get<string>('NOVA_SUMMARY_MODEL'); //arn url 갖고 와야함
    if (!modelId) {
      // .env에 NOVA_SUMMARY_MODEL이 없으면 바로 애플리케이션이 뜨지 않게 막는다.
      throw new Error(
        'NOVA_SUMMARY_MODEL env is not set (Bedrock Nova ARN 필요).',
      );
    }
    this.modelId = modelId;

    this.defaultMaxTokens =
      Number(this.configService.get<string>('NOVA_SUMMARY_MAX_TOKENS')) || 512;
  }

  /**
   * 1~2줄 요약에 맞춘 편의 메서드 (기존 퍼블릭 API 유지)
   */
  async summarizeDescription(description: string): Promise<string> {
    return this.summarize(description, { maxLength: 2, language: '한국어' });
  }

  /**
   * 요약 결과가 의미 있는 문장인지 간단히 검증한다.
   * - 최소 길이/문자 수를 만족해야 하고
   * - 전부 기호/반복 단어로만 이루어진 경우를 걸러낸다.
   */
  isValidSummary(summary?: string): boolean {
    const text = summary?.trim();
    if (!text || text.length < 8) {
      return false;
    }

    const alphaCount = (text.match(/[A-Za-z가-힣]/g) ?? []).length;
    if (alphaCount < 4) {
      return false;
    }

    const punctuationCount = (text.match(/[^\w가-힣\s]/g) ?? []).length;
    const punctuationRatio = punctuationCount / text.length;
    if (punctuationRatio > 0.4) {
      return false;
    }

    const tokens = text.split(/\s+/).filter(Boolean);
    const uniqueTokenCount = new Set(tokens).size;
    if (uniqueTokenCount <= 2 && text.length < 20) {
      return false;
    }

    // 동일 문자 반복이나 극히 적은 문자 다양성으로 채워진 경우 거른다.
    if (/(.)\1{6,}/.test(text)) {
      return false;
    }
    const uniqueChars = new Set(text.replace(/\s+/g, '').split(''));
    if (uniqueChars.size <= 3 && text.length >= 10) {
      return false;
    }

    return true;
  }

  /**
   * LLM에게 요약이 의미 있는지 이진 분류를 요청한다.
   * - INVALID가 반환되면 false
   * - 응답 파싱 실패/오류 시에는 true를 반환해 기존 로직을 막지 않는다.
   */
  async isMeaningfulSummaryLLM(
    summary: string,
    timeout = 3000,
  ): Promise<boolean> {
    const trimmed = summary?.trim();
    if (!trimmed) {
      return false;
    }

    const prompt =
      `Decide if the following Korean text is a meaningful, coherent summary (not gibberish, spam, or insults). ` +
      `Reply with exactly one word: VALID or INVALID.\n\nText:\n${trimmed}`;

    const command = new ConverseCommand({
      modelId: this.modelId,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: this.validationMaxTokens,
        temperature: 0,
        topP: 0,
      },
    });

    try {
      const response = await this.client.send(command, {
        requestTimeout: timeout,
      });
      const verdict = this.extractText(response)?.toUpperCase().trim();
      if (!verdict) {
        return true;
      }
      return verdict.startsWith('VALID');
    } catch (error) {
      // 요약 생성까지는 성공했으므로 검증 실패 시에는 로깅만 하고 통과시킨다.
      this.logger.warn(
        `LLM summary validation skipped due to error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return true;
    }
  }

  /**
   * Nova Lite를 이용해 주어진 텍스트를 요약한다.
   * - 입력이 공백이면 즉시 빈 문자열 반환
   * - 실패 시에도 빈 문자열로 폴백하여 호출부 영향 최소화
   */
  async summarize(
    text: string,
    options: SummarizeOptions = {},
  ): Promise<string> {
    if (!text?.trim()) {
      return '';
    }

    const {
      maxLength = 2,
      language = '한국어',
      temperature = 0.7, //랜덤성
      timeout = 5000,
    } = options;

    // Nova 모델은 영어 지시문을 선호하지만, 한국어 결과를 원하므로 명확히 지정한다.
    const prompt = `Summarize the following text in ${language} within ${maxLength} sentences. Make it concise but preserve key facts.\n\n---\n${text}\n---`;

    // Bedrock Converse API는 role/content 구조를 사용한다. (텍스트만 사용하므로 심플)
    const messages: Message[] = [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ];

    const command = new ConverseCommand({
      modelId: this.modelId,
      messages,
      inferenceConfig: {
        temperature,
        topP: 0.9,
        maxTokens: this.defaultMaxTokens,
      },
    });

    try {
      // requestTimeout으로 SDK 차원의 타임아웃을 강제해 네트워크 지연으로부터 호출부를 보호한다.
      const response = await this.client.send(command, {
        requestTimeout: timeout,
      });
      const summary = this.extractText(response);

      if (!summary) {
        this.logger.warn('Nova Lite returned an empty summary response.');
        return '';
      }

      return summary;
    } catch (error) {
      this.handleError(error);
      return '';
    }
  }

  /**
   * Converse 응답 객체에서 텍스트 블록만 추출해 하나의 문자열로 합친다.
   */
  private extractText(response: ConverseCommandOutput): string | null {
    const contentBlocks = response.output?.message?.content;
    if (!contentBlocks?.length) {
      return null;
    }

    const chunks = contentBlocks
      .map((block) => block.text?.trim())
      .filter((chunk): chunk is string => Boolean(chunk));
    // Nova는 하나 이상의 텍스트 블록을 반환할 수 있으므로 모두 이어붙여 완성된 요약으로 만든다.
    //nova는 블록단위로 답변을 보내는 데, 블록을 합쳐서 하나의 답변을 만든다

    if (!chunks.length) {
      return null;
    }

    return chunks.join('\n');
  }

  /**
   * Bedrock 예외는 전부 BedrockRuntimeServiceException을 확장하므로 이를 우선 처리한다.
   */
  private handleError(error: unknown): void {
    if (error instanceof BedrockRuntimeServiceException) {
      const status = error.$metadata?.httpStatusCode;
      this.logger.error(
        `Bedrock service error (${status ?? 'unknown'}) - ${error.name}: ${error.message}`,
      );
      return;
    }

    if (error instanceof Error) {
      // SDK 레벨에서 발생한 네트워크/직렬화 오류 등은 여기서 전부 처리한다.
      this.logger.error(`Bedrock client error: ${error.message}`, error.stack);
      return;
    }

    this.logger.error('Unknown error occurred while calling Nova Lite', error);
  }
}
