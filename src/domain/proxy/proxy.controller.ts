import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  // 카카오맵 타일 이미지 URL은 보통 .daumcdn.net 또는 .kakaocdn.net 으로 끝납니다.
  // 보안을 위해 허용할 도메인 목록을 명확히 정의합니다.
  private readonly allowedDomains = [
    'map.daumcdn.net',
    'map.kakaocdn.net',
    't1.daumcdn.net',
    't2.daumcdn.net',
    't3.daumcdn.net',
    'map2.daum.net',
    'dapi.kakao.com',
    'mts.daumcdn.net',
    'tong.visitkorea.or.kr',
  ];

  constructor(private readonly httpService: HttpService) {}

  @Get('image')
  async getImage(@Query('url') imageUrl: string, @Res() res: Response) {
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required.');
    }

    try {
      const url = new URL(imageUrl);
      // URL의 hostname이 허용된 도메인 목록에 있는지 확인합니다.
      if (
        !this.allowedDomains.some((domain) => url.hostname.endsWith(domain))
      ) {
        this.logger.warn(`[Proxy] Forbidden access attempt to: ${imageUrl}`);
        throw new BadRequestException('Provided URL is not allowed.');
      }

      // [수정] 요청 헤더를 동적으로 구성한다.
      const requestHeaders: Record<string, string> = {};

      // 공식 static map api 를 호출하는 경우 인증 헤더를 추가한다.
      if (url.hostname === 'dapi.kakao.com') {
        if (!process.env.KAKAO_REST_API_KEY) {
          this.logger.error('[Proxy] KAKAO_REST_API_KEY is not set in .env');
          throw new InternalServerErrorException('Server configuration error');
        }

        // [추가] Static Map API의 size 파라미터 유효성 검사
        const sizeParam = url.searchParams.get('size');
        if (sizeParam && !/^\d+x\d+$/.test(sizeParam)) {
          this.logger.warn(
            `[Proxy] Invalid size parameter for Kakao Static Map API: ${sizeParam}`,
          );
          throw new BadRequestException('Invalid size parameter.');
        }

        // [추가] Static Map API의 marker 파라미터 형식 검사
        const markerParam = url.searchParams.get('marker');
        if (markerParam && !markerParam.includes('pos:')) {
          throw new BadRequestException(
            'Invalid marker parameter: must use "pos".',
          );
        }

        requestHeaders['Authorization'] =
          `KakaoAK ${process.env.KAKAO_REST_API_KEY}`;
      }

      const response = await firstValueFrom(
        // this.httpService.get(imageUrl, { responseType: 'stream' }),
        this.httpService.get(imageUrl, {
          headers: requestHeaders,
          responseType: 'stream',
        }),
      );

      // 원본 이미지의 Content-Type 헤더를 그대로 설정
      res.setHeader('Content-Type', response.headers['content-type']);
      // 이미지 데이터를 클라이언트로 스트리밍
      response.data.pipe(res);
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `[Proxy] Failed to fetch image from ${imageUrl}`,
          error.stack,
        );
        throw new InternalServerErrorException('Failed to fetch the image.');
      }
      // URL 유효성 검사 실패 등 다른 예외 처리
      this.logger.error(
        `[Proxy] Error processing image proxy for ${imageUrl}`,
        error.stack,
      );
      throw error;
    }
  }
}
