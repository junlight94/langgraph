import { ChatOpenAI } from "@langchain/openai";
import { createPrdPage } from "../tools/notion-tools";
import type { AppGraphState } from "../state";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

export async function prdWriteNode(state: AppGraphState) {
  const response = await model.invoke([
    {
      role: "system",
      content: `너는 PRD(제품 요구사항 문서) 작성 전문가야.
사용자의 요청을 바탕으로 PRD를 작성해.

응답은 반드시 아래 형식으로 시작해:
제목: ...
카테고리: (탐색|결제|AI|알림|캘린더|온보딩 중 하나)
우선순위: (P0|P1|P2|P3 중 하나)
목표: (한 줄 요약)

그 다음 줄부터 PRD 본문을 작성해:
## 1. 배경
## 2. 문제 정의
## 3. 목표
## 4. 가설
## 5. 해결 방향
## 6. 범위
## 7. 요구사항
## 8. 리스크 / 오픈 이슈`,
    },
    { role: "user", content: state.userInput },
  ]);

  const text = response.content.toString();

  const titleMatch = text.match(/제목:\s*(.+)/);
  const categoryMatch = text.match(/카테고리:\s*(.+)/);
  const priorityMatch = text.match(/우선순위:\s*(.+)/);
  const goalMatch = text.match(/목표:\s*(.+)/);

  const meta = {
    title: titleMatch ? titleMatch[1].trim() : "새 PRD",
    category: categoryMatch ? categoryMatch[1].trim() : undefined,
    priority: priorityMatch ? priorityMatch[1].trim() : undefined,
    goal: goalMatch ? goalMatch[1].trim() : undefined,
  };

  const content = text
    .replace(/제목:\s*.+\n?/, "")
    .replace(/카테고리:\s*.+\n?/, "")
    .replace(/우선순위:\s*.+\n?/, "")
    .replace(/목표:\s*.+\n?/, "")
    .trim();

  const pageId = await createPrdPage(meta, content);

  return {
    result: `PRD "${meta.title}"가 Notion에 저장되었습니다.\n카테고리: ${meta.category ?? "-"} | 우선순위: ${meta.priority ?? "-"} | 상태: 작성중\n(Page ID: ${pageId})`,
  };
}
