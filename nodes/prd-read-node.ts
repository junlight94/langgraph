import { ChatOpenAI } from "@langchain/openai";
import { getPrdPages } from "../tools/notion-tools";
import type { AppGraphState } from "../state";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

export async function prdReadNode(state: AppGraphState) {
  const pages = await getPrdPages();

  if (pages.length === 0) {
    return { result: "Notion에 저장된 PRD가 없습니다." };
  }

  const prdList = pages
    .map((p) => `### ${p.title}\n${p.content}`)
    .join("\n\n---\n\n");

  const response = await model.invoke([
    {
      role: "system",
      content:
        "아래는 Notion에서 가져온 PRD 목록이야. 각 PRD의 '제목/상태/우선순위/카테고리/목표'를 보여줘",
    },
    { role: "user", content: `질문: ${state.userInput}\n\nPRD 목록:\n${prdList}` },
  ]);

  return { result: response.content.toString() };
}
