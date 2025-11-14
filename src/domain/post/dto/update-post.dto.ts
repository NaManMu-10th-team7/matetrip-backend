import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PostStatus } from '../entities/post-status.enum.js';
import { Transform } from 'class-transformer';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  // 게시글 수정 API 호출 시 post의 id를 전달받으므로 id 필드가 불필요함.
  // @IsNotEmpty()
  // @IsUUID()
  // id: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const raw = String(value).trim();
    const key = raw.toUpperCase() as keyof typeof PostStatus;
    return PostStatus[key] ?? raw;
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}

// @IsArray()
// @IsOptional()
// @IsEnum(KeywordType, { each: true })
// keywords?: KeywordType[] = [];
