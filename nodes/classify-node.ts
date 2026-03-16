import { ChatOpenAI } from "@langchain/openai";
import type { AppGraphState } from "../state";

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

export async function classifyNode(state: AppGraphState) {
  const response = await model.invoke([
    {
      role: "system",
      content: `사용자의 의도를 분류해. 반드시 아래 중 하나만 답해:
- prd_write: PRD 작성 요청
- prd_read: 기존 PRD 조회/요약 요청
- jira_create: PRD 기반 JIRA 이슈 티켓 생성 요청
- general: 그 외 일반 질문`,
    },
    { role: "user", content: state.userInput },
  ]);

  const text = response.content.toString().toLowerCase();

  if (text.includes("jira_create")) return { intent: "jira_create" as const };
  if (text.includes("prd_write")) return { intent: "prd_write" as const };
  if (text.includes("prd_read")) return { intent: "prd_read" as const };
  return { intent: "general" as const };
}
