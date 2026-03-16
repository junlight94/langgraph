import "dotenv/config";
import * as readline from "readline";
import { graph } from "./graph";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const topic = await ask("어떤 PRD를 작성할까요? (예: 채팅 기능, 결제 시스템 등): ");
  rl.close();

  console.log("\nPRD 작성 중...\n");

  const result = await graph.invoke({
    userInput: `다음 주제로 PRD 작성해줘: ${topic}`,
  });

  console.log(result.result);
}

main().catch(console.error);
