export class ChatMessageResDto {
  readonly username: string;
  readonly message: string;
  readonly userId: string; // userId 필드 추가
  readonly toolData?: any[]; // 에이전트 tool_data를 담을 필드 추가

  constructor(
    username: string,
    message: string,
    userId: string,
    toolData?: any[],
  ) {
    // constructor 수정
    this.username = username;
    this.message = message;
    this.userId = userId; // userId 할당
    this.toolData = toolData;
  }

  static of(
    username: string,
    message: string,
    userId: string,
    toolData?: any[],
  ): ChatMessageResDto {
    // of 메서드 수정
    return new ChatMessageResDto(username, message, userId, toolData);
  }
}
