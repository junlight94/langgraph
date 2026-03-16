import { ChatOpenAI } from "@langchain/openai";
import {
  createJiraIssuesWithSubtasks,
  type JiraIssue,
} from "../tools/jira-tools";
import type { AppGraphState } from "../state";

const ISSUE_TEMPLATE_EXAMPLE = `## Summary
결제 수단 등록 및 관리 기능

## Background
- 사용자가 다양한 결제 수단을 등록하고 관리할 수 있어야 함
- 현재 결제 시마다 카드 정보를 입력해야 하는 불편함 존재

## Goal
- 사용자가 결제 수단을 사전 등록하여 결제 편의성을 높인다

## User Story
- As a 일반 사용자
- I want 결제 수단을 미리 등록해두고 싶다
- So that 결제할 때마다 카드 정보를 입력하지 않아도 된다

## Scope
### In Scope
- 신용/체크카드 등록, 수정, 삭제
- 기본 결제 수단 설정

### Out of Scope
- 해외 결제 수단 지원
- 포인트/쿠폰 결제

## Requirement
- 카드 번호는 PCI DSS 기준에 맞게 토큰화 저장
- 최대 5개까지 등록 가능
- 기본 결제 수단 1개 필수 설정

## Acceptance Criteria
- [ ] 카드 등록 시 유효성 검증 통과
- [ ] 등록된 카드 목록 조회 가능
- [ ] 기본 결제 수단 변경 가능

## Test Case
- TC1: 유효한 카드 번호로 등록 → 성공
- TC2: 만료된 카드 등록 시도 → 에러 메시지 표시
- TC3: 5개 초과 등록 시도 → 등록 불가 안내

## Design / Reference
- Figma:
- API Spec:
- 관련 문서:
- 의존 이슈:

## Notes
- PG사 연동 API 확인 필요`;

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

export async function jiraNode(state: AppGraphState) {
  const response = await model.invoke([
    {
      role: "system",
      content: `너는 PRD를 기반으로 JIRA Story 이슈를 만드는 시니어 PO야.

## 중요한 규칙
1. 모든 최상위 이슈는 반드시 issueType이 "Story"여야 한다. Task로 만들지 마.
2. Story는 2~4개만 만들어. 핵심 기능 단위로만 나눠.
3. 하나의 Story 안에서 세부 작업이 필요하면 subtasks 배열에 넣어.
4. 각 Story의 description은 반드시 아래 템플릿의 모든 섹션을 PRD 내용으로 채워서 작성해.
5. 템플릿의 placeholder가 아닌 실제 PRD 기반 내용으로 채워야 한다.
6. 제목은 사용자의 행동으로 시작해야된다. (예: "사용자가 결제 수단을 등록할 수 있다.")

## Story description 템플릿 (모든 섹션 필수)
## Summary
[이 스토리의 한 줄 요약]

## Background
- [왜 필요한 기능인지]
- [어떤 문제를 해결하는지]

## Goal
- [이 스토리에서 달성해야 하는 목표]

## User Story
- As a [사용자 유형]
- I want [원하는 행동]
- So that [얻고 싶은 가치]

## Scope
### In Scope
- [이번 스토리에서 포함되는 범위]

### Out of Scope
- [이번 스토리에서 제외되는 범위]

## Requirement
- [화면/기능 요구사항]
- [정책]
- [예외사항]

## Acceptance Criteria
- [ ] [구체적인 AC 1]
- [ ] [구체적인 AC 2]
- [ ] [구체적인 AC 3]

## Test Case
- [TC 1: 구체적인 시나리오]
- [TC 2: 구체적인 시나리오]

## Design / Reference
- Figma:
- API Spec:
- 관련 문서:
- 의존 이슈:

## Notes
- [개발 시 참고사항]

## 실제 작성 예시
${ISSUE_TEMPLATE_EXAMPLE}

## 응답 형식
반드시 JSON 배열만 응답해. 다른 텍스트를 넣지 마.
[
  {
    "summary": "Story 제목",
    "description": "위 템플릿을 PRD 내용으로 채운 마크다운",
    "issueType": "Story",
    "priority": "High 또는 Medium 또는 Low",
    "subtasks": [
      {
        "summary": "하위 태스크 제목",
        "description": "구체적인 작업 내용",
        "priority": "Medium"
      }
    ]
  }
]`,
    },
    { role: "user", content: state.userInput },
  ]);

  const text = response.content.toString();
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    return { result: "이슈 티켓 생성에 실패했습니다. PRD 내용을 확인해주세요." };
  }

  const issues: JiraIssue[] = JSON.parse(jsonMatch[0]);

  // issueType을 강제로 Story로 세팅
  for (const issue of issues) {
    issue.issueType = "Story";
  }

  const results = await createJiraIssuesWithSubtasks(issues);

  const summary = results
    .map((r) => {
      let line = `${r.key} - ${r.summary}\n  ${r.url}`;
      if (r.subtasks.length > 0) {
        line +=
          "\n" +
          r.subtasks.map((s) => `    └ ${s.key} - ${s.summary}`).join("\n");
      }
      return line;
    })
    .join("\n\n");

  const subtaskCount = results.reduce((acc, r) => acc + r.subtasks.length, 0);

  return {
    result: `JIRA Story ${results.length}개 + Subtask ${subtaskCount}개가 생성되었습니다.\n\n${summary}`,
  };
}
