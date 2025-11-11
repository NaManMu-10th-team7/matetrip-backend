import { Injectable } from '@nestjs/common';
import { OpenVidu, Session } from 'openvidu-node-client';

@Injectable()
export class OpenViduService {
  private ov: OpenVidu;
  private sessions: Map<string, Session> = new Map(); // 만들어진 방(세션) 저장용

  constructor() {
    //  OpenVidu 서버 URL + Secret (환경변수로 관리)
    this.ov = new OpenVidu(
      process.env.OPENVIDU_URL!,
      process.env.OPENVIDU_SECRET!, // docker 실행할 때 넣었던 secret 값
    );
  }

  /**
   *  workspaceId(방 이름)으로 OpenVidu 세션을 생성하거나 기존 세션을 가져온다
   */
  private async getOrCreateSession(workspaceId: string) {
    if (this.sessions.has(workspaceId)) {
      return this.sessions.get(workspaceId)!; // 방이 이미 있으면 재사용
    }

    //  새로운 세션(방) 생성
    //customSessionId 사용: 우리가 지정한 문자열(workspaceId)이 곧 세션 ID가 됨
    const newSession = await this.ov.createSession({
      customSessionId: workspaceId,
    });
    this.sessions.set(workspaceId, newSession);
    return newSession;
  }

  /**
   * 세션에 들어갈 토큰을 발급해준다.
   * OpenVidu 클라이언트(프론트)는 **이 토큰으로 WebRTC 연결**을 한다.
   */
  async generateToken(workspaceId: string) {
    try {
      const session = await this.getOrCreateSession(workspaceId);
      const connection = await session.createConnection();
      return connection.token;
    } catch (err) {
      if (this.isSessionNotFoundError(err)) {
        // 세션이 만료되면 OpenVidu가 404를 응답하므로 캐시를 갱신한다(404면 세션 지우고 세션 다시 만듬)
        this.sessions.delete(workspaceId);
        const freshSession = await this.getOrCreateSession(workspaceId);
        const connection = await freshSession.createConnection();
        return connection.token;
      }
      throw err;
    }
  }

  private isSessionNotFoundError(err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'response' in err &&
      err.response &&
      typeof err.response === 'object' &&
      'status' in err.response
    ) {
      const status = (err.response as { status?: unknown }).status;
      return status === 404;
    }
    if (err instanceof Error && Number(err.message) === 404) {
      return true;
    }
    return false;
  }
}
