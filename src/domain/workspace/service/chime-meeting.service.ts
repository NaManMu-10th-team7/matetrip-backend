import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Attendee,
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  Meeting,
} from '@aws-sdk/client-chime-sdk-meetings';
import { v4 as uuidv4 } from 'uuid';

type JoinResult = {
  meeting: Meeting;
  attendee: Attendee;
};

@Injectable()
export class ChimeMeetingService {
  private readonly logger = new Logger(ChimeMeetingService.name);
  private readonly client: ChimeSDKMeetingsClient;
  private readonly mediaRegion: string;
  private readonly meetingCache = new Map<string, Meeting>();

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const sessionToken = this.configService.get<string>('AWS_SESSION_TOKEN');
    const region =
      this.configService.get<string>('AWS_CHIME_REGION') ||
      this.configService.get<string>('CHIME_REGION') ||
      this.configService.get<string>('AWS_REGION');
    this.mediaRegion =
      this.configService.get<string>('CHIME_MEDIA_REGION') || region || '';

    if (!accessKeyId || !secretAccessKey || !region || !this.mediaRegion) {
      throw new Error(
        'Chime credentials or region are not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and CHIME_MEDIA_REGION (or AWS_REGION).',
      );
    }

    this.client = new ChimeSDKMeetingsClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken || undefined,
      },
    });
  }

  /**
   * 워크스페이스별 화상회의(미팅)을 만들고, 참가자 토큰을 발급한다.
   * - 미팅은 워크스페이스 단위로 1개를 재사용한다.
   * - 만료/삭제된 미팅이면 캐시를 비우고 새로 생성한다.
   */
  async joinWorkspace(
    workspaceId: string,
    userId: string,
    username: string,
  ): Promise<JoinResult> {
    const meeting = await this.getOrCreateMeeting(workspaceId);
    const externalUserId = this.buildExternalUserId(userId, username);

    try {
      const attendeeResult = await this.client.send(
        new CreateAttendeeCommand({
          MeetingId: meeting.MeetingId,
          ExternalUserId: externalUserId,
          Capabilities: {
            Audio: 'SendReceive',
            Video: 'SendReceive',
            Content: 'SendReceive',
          },
        }),
      );

      if (!attendeeResult.Attendee) {
        throw new Error('Chime attendee creation returned empty response.');
      }

      return {
        meeting,
        attendee: attendeeResult.Attendee,
      };
    } catch (error) {
      if (this.isMeetingNotFound(error)) {
        this.logger.warn(
          `Chime meeting for workspace ${workspaceId} expired. Recreating...`,
        );
        this.meetingCache.delete(workspaceId);
        const freshMeeting = await this.getOrCreateMeeting(workspaceId);
        const attendeeResult = await this.client.send(
          new CreateAttendeeCommand({
            MeetingId: freshMeeting.MeetingId,
            ExternalUserId: externalUserId,
            Capabilities: {
              Audio: 'SendReceive',
              Video: 'SendReceive',
              Content: 'SendReceive',
            },
          }),
        );

        if (!attendeeResult.Attendee) {
          throw new Error(
            'Chime attendee creation returned empty response after meeting refresh.',
          );
        }

        return {
          meeting: freshMeeting,
          attendee: attendeeResult.Attendee,
        };
      }

      this.logger.error(
        `Failed to create attendee for workspace ${workspaceId}: ${this.stringifyError(error)}`,
      );
      throw error;
    }
  }

  private async getOrCreateMeeting(workspaceId: string): Promise<Meeting> {
    const cached = this.meetingCache.get(workspaceId);
    if (cached) {
      return cached;
    }

    const externalMeetingId = this.buildExternalMeetingId(workspaceId);
    const result = await this.client.send(
      new CreateMeetingCommand({
        ClientRequestToken: workspaceId, // idempotent creation per workspace
        MediaRegion: this.mediaRegion,
        ExternalMeetingId: externalMeetingId,
      }),
    );

    if (!result.Meeting) {
      throw new Error('Failed to create Chime meeting.');
    }

    this.meetingCache.set(workspaceId, result.Meeting);
    return result.Meeting;
  }

  private buildExternalMeetingId(workspaceId: string): string {
    // ExternalMeetingId는 최대 64자, 특수문자 제한이 있으므로 안전한 형태로 변환
    const safe = workspaceId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
    return safe.slice(0, 64);
  }

  private buildExternalUserId(userId: string, username: string): string {
    const base = `${username || 'guest'}#${userId || uuidv4()}`;
    const safe = base.replace(/[^a-zA-Z0-9_.@-]/g, '_');
    return safe.slice(0, 64);
  }

  private isMeetingNotFound(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    return (
      name === 'NotFoundException' ||
      name === 'ResourceNotFoundException' ||
      status === 404
    );
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
