import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextDecoder, TextEncoder } from 'util';

// Titan 응답이 여러 벡터를 담을 수 있어서 최소 구조만 정의
interface TitanEmbeddingVector {
  embedding?: number[];
}

interface TitanEmbeddingResponse {
  embedding?: number[];
  embeddings?: TitanEmbeddingVector[];
}

@Injectable()
// AWS Bedrock Titan 임베딩 전용 클라이언트
export class TitanEmbeddingService {
  private readonly logger = new Logger(TitanEmbeddingService.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly dimensions: number;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(private readonly configService: ConfigService) {
    // Bedrock 호출에 필요한 액세스 키·리전 정보를 전부 .env에서 읽어온다.
    const accessKeyId =
      this.configService.get<string>('AWS_LLM_ACCESS_KEY_ID') ?? '';
    const secretAccessKey =
      this.configService.get<string>('AWS_LLM_SECRET_ACCESS_KEY') ?? '';
    const sessionToken =
      this.configService.get<string>('AWS_SESSION_TOKEN') ?? undefined;
    const region =
      this.configService.get<string>('AWS_BEDROCK_REGION') ||
      this.configService.get<string>('AWS_REGION');

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error('Bedrock credentials or region are not configured.');
    }

    // Bedrock client is created once; credentials pulled from .env via ConfigService
    this.client = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey, sessionToken },
    });

    this.modelId =
      this.configService.get<string>('TITAN_EMBEDDING_MODEL') ??
      'amazon.titan-embed-text-v2:0';
    this.dimensions =
      Number(this.configService.get<string>('TITAN_EMBEDDING_DIM')) || 1024;
  }

  /**
   * 주어진 텍스트를 Titan Embeddings v2 모델(1024차원 기본)로 벡터화한다.
   * - 공백 문자열이면 null 반환
   * - 정상 호출 시 number[] 벡터를 돌려주고, 실패해도 예외 대신 null로 폴백
   */
  async embedText(text: string): Promise<number[] | null> {
    if (!text?.trim()) {
      return null;
    }

    // Titan v2 text embedding payload
    const payload = {
      inputText: text,
      dimensions: this.dimensions,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: this.encoder.encode(JSON.stringify(payload)),
    });

    try {
      // Bedrock Runtime은 body를 Uint8Array 형태로 돌려주므로 UTF-8 문자열로 다시 디코딩
      const response = await this.client.send(command);
      const decoded = response.body
        ? this.decoder.decode(response.body)
        : undefined;
      if (!decoded) {
        this.logger.warn('Titan embedding response body is empty');
        return null;
      }

      // Response can be in legacy `embedding` or new `embeddings[0].embedding`
      const parsed = JSON.parse(decoded) as TitanEmbeddingResponse;
      const embedding =
        parsed.embedding ?? parsed.embeddings?.[0]?.embedding ?? null;

      if (!embedding) {
        this.logger.warn('Titan embedding response missing embedding vector');
        return null;
      }

      if (Array.isArray(embedding)) {
        return embedding;
      }

      // TypedArray 혹은 문자열 형태로 내려오는 경우 방어 처리
      if (
        typeof embedding === 'object' &&
        embedding !== null &&
        'length' in (embedding as { length: number })
      ) {
        return Array.from(embedding as ArrayLike<number>);
      }

      if (typeof embedding === 'string') {
        const textEmbedding = embedding as string;
        const parts = textEmbedding
          .trim()
          .split(/\s+/)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        if (parts.length) {
          return parts;
        }
      }

      this.logger.warn(
        'Titan embedding response has unsupported format',
        typeof embedding,
      );
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Titan embedding failed: ${message}`, stack);
      return null;
    }
  }
}
