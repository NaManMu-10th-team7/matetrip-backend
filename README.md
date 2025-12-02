<h1 align="center">MateTrip Backend</h1>

<p align="center">
  AI 기반 여행 메이트 매칭 & 실시간 협업 플래너 백엔드<br/>
  <b>NestJS · TypeORM · PostgreSQL · Redis · WebSocket · RabbitMQ · AWS Bedrock</b>
</p>

<p align="center">
  <img width="800" alt="MateTrip Backend Poster" src="https://github.com/user-attachments/assets/610ca8b3-90d6-44f9-9329-38eb1431241b" />
</p>

---

## ✨ Introduction

**MateTrip Backend**는

- AI가 여행 일정을 함께 설계해 주고
- 여러 명이 실시간으로 같은 보드를 보면서 일정을 편집하고
- 프로필 기반으로 잘 맞는 여행 메이트를 추천해주는

소셜 여행 서비스 **MateTrip**의 백엔드 서버입니다.

`NestJS` + `PostgreSQL(PostGIS, pgvector)` + `Redis` + `RabbitMQ` + `AWS Bedrock`을 기반으로  
**AI 에이전트, 실시간 협업, 메이트 매칭**을 하나의 플랫폼으로 묶는 데 집중했습니다.

---


## 📌 핵심 기능

### 🤖 AI 기반 여행 컨설팅
<img width="980" height="645" alt="image" src="https://github.com/user-attachments/assets/67ba737c-3efc-4d6a-88fd-4ce25b385f73" />
- FastAPI + LangGraph로 구현한 **MateTrip AI 서버**와 연동
- 채팅 한 줄로:
  - 일정 초안 생성
  - 주변 장소 추천
  - 일정 수정 등
- 사용자 행동(북마크, 일정 추가 등)을 RabbitMQ로 AI 서버에 보내 **개인화 학습**에 활용

---

### 🤝 실시간 협업 워크스페이스
<img width="975" height="553" alt="image" src="https://github.com/user-attachments/assets/8d073ffd-7033-453a-b85e-ae210765a745" />

- `Socket.IO` + `Redis Adapter`로 **다중 서버 환경에서도 실시간 동기화**
- 한 워크스페이스에 여러 사용자가 동시에 참여해:
  - 채팅
  - POI(추가/삭제/순서 변경)
  - 일별 일정 관리(N박 M일)
- AI 응답(추천 장소, 최적화 경로)을 WebSocket으로 브로드캐스트하여  
  **모든 참여자 지도/일정에 바로 반영**

> 실시간 구조: [docs/workspace-realtime.md](./docs/workspace-realtime.md)

---

### 🎯 지능형 여행 메이트 매칭

- 프로필 기반 벡터 임베딩 (`AWS Titan Embeddings v2` + `pgvector`)
- 여행 스타일(16가지), 여행 성향(80+), MBTI 등을 함께 고려하는 **하이브리드 점수**
- 모집글(여행지/일정/조건) + 프로필을 결합해 **함께 갈 메이트 추천**

```text
매칭 점수 = (벡터 유사도 × 0.7)
          + (여행 스타일 겹침도 × 0.15)
          + (여행 성향 겹침도 × 0.1)
          + (MBTI 궁합 × 0.05)
```


## 🧱 기술 스택

- **Language & Framework** : NestJS, TypeScript, Node.js
- **Database & ORM** : PostgreSQL, PostGIS (공간 쿼리), pgvector (벡터 검색), TypeORM
- **Real-time** : Socket.IO, redis-adapter, ioredis
- **Message Queue** : RabbitMQ (AWS MQ)
- **Auth** : JWT, bcrypt
- **AWS** : S3 (이미지 저장), Chime SDK (화상 회의), Bedrock

## API 문서


## 🔗 Related
MateTrip AI Server (FastAPI + LangGraph): AI 에이전트 & 추천/경로 최적화 서버
