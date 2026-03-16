import { ChatOpenAI } from "@langchain/openai";
import type { AppGraphState } from "../state";

const model = new ChatOpenAI({ model: "gpt-4o-mini" });

export async function generalNode(state: AppGraphState) {
  const response = await model.invoke([
    {
      role: "system",
      content: "너는 친절한 범용 AI 어시스턴트야. 사용자의 질문에 도움이 되게 답변해줘.",
    },
    { role: "user", content: state.userInput },
  ]);

  return { result: response.content.toString() };
}
