# LangGraph PRD Manager

AI 기반 PRD(Product Requirements Document) 관리 시스템입니다. LangGraph 워크플로우를 통해 PRD 작성, 조회, JIRA 이슈 생성을 자동화합니다.

## 주요 기능

- **PRD 작성** — 주제를 입력하면 구조화된 PRD를 AI가 생성하고 Notion에 저장
- **PRD 조회** — Notion에 저장된 PRD를 조회하고 요약
- **JIRA 연동** — PRD 기반으로 JIRA Story 이슈 및 서브태스크 자동 생성
- **일반 Q&A** — 자유로운 대화형 질의응답

## 아키텍처

```
사용자 입력 → 의도 분류(classify) → prd_write | prd_read | jira_create | general → 결과 반환
```

LangGraph의 조건부 라우팅을 활용하여 사용자 의도에 따라 적절한 노드로 분기합니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| 워크플로우 | LangGraph, LangChain |
| LLM | OpenAI GPT-4o-mini |
| 외부 연동 | Notion API, JIRA REST API |
| 백엔드 | Express.js, TypeScript |
| CLI | Inquirer.js |

## 프로젝트 구조

```
├── nodes/                 # LangGraph 노드
│   ├── classify-node.ts   # 의도 분류
│   ├── general-node.ts    # 일반 Q&A
│   ├── prd-read-node.ts   # PRD 조회/요약
│   ├── prd-write-node.ts  # PRD 생성
│   └── jira-node.ts       # JIRA 이슈 생성
├── tools/                 # 외부 연동 도구
│   ├── notion-tools.ts    # Notion API
│   └── jira-tools.ts      # JIRA API
├── public/index.html      # 웹 UI
├── state.ts               # 상태 정의
├── graph.ts               # 워크플로우 그래프
├── server.ts              # Express 서버
├── run-prd.ts             # 대화형 CLI
├── run-prd-read.ts        # PRD 조회 CLI
└── run-prd-write.ts       # PRD 작성 CLI
```

## 시작하기

### 환경 변수 설정

`.env` 파일을 생성하고 다음 값을 설정합니다:

```env
OPENAI_API_KEY=
NOTION_API_KEY=
NOTION_DATABASE_ID=
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
```

### 설치 및 실행

```bash
npm install
```

**웹 서버 실행:**

```bash
npm run dev
```

**CLI 실행:**

```bash
npm run prd          # 대화형 PRD 관리
npm run prd:read     # PRD 조회
npm run prd:write    # PRD 작성
npm run cli          # 일반 CLI
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/prd` | PRD 목록 조회 |
| POST | `/api/prd` | PRD 생성 |
| PUT | `/api/prd/:id` | PRD 수정 |
| POST | `/api/jira` | JIRA 이슈 생성 |
| POST | `/api/chat` | 채팅 |
| GET | `/api/settings` | 설정 조회 |
| PUT | `/api/settings` | 설정 저장 |
