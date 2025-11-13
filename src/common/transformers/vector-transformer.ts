import { ValueTransformer } from 'typeorm';

// TypeORM이 기본적으로 배열을 `{"0.1","0.2"}`처럼 직렬화하는데 pgvector는 `[0.1,0.2]`를 요구합니다.
// 이 변환기를 통해 엔티티에서는 number[]를 그대로 쓰되 DB 입출력을 pgvector 형식으로 맞춥니다.
export const vectorTransformer: ValueTransformer = {
  to(value: number[] | null): string | null {
    if (!value || value.length === 0) {
      return null;
    }
    // pgvector expects bracketed comma-separated numbers.
    return `[${value.join(',')}]`;
  },
  from(value: string | number[] | null): number[] | null {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map((num) => Number(num));
    }
    const trimmed = value.trim();
    const content = trimmed.replace(/^\[|\]$/g, '');
    if (!content) {
      return [];
    }
    return content.split(',').map((num) => Number(num));
  },
};
