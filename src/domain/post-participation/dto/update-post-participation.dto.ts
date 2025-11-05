import { IsEnum, IsNotEmpty } from 'class-validator';

export enum PostParticipationStatus {
  APPROVED = '승인',
  REJECTED = '거절',
}

export class UpdatePostParticipationDto {
  @IsNotEmpty({ message: '상태를 입력해주세요.' })
  @IsEnum(PostParticipationStatus, {
    message: '상태는 "승인" 또는 "거절"만 가능합니다.',
  })
  status: PostParticipationStatus;
}
