export class ChatMessageResDto {
  readonly username: string;
  readonly message: string;
  readonly userId: string; // userId 필드 추가

  constructor(username: string, message: string, userId: string) {
    // constructor 수정
    this.username = username;
    this.message = message;
    this.userId = userId; // userId 할당
  }

  static of(
    username: string,
    message: string,
    userId: string,
  ): ChatMessageResDto {
    // of 메서드 수정
    return new ChatMessageResDto(username, message, userId);
  }
}
