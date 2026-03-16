import "dotenv/config";
import * as readline from "readline";
import { graph } from "./graph";
import { getPrdPages, updatePrdPage } from "./tools/notion-tools";
import { ChatOpenAI } from "@langchain/openai";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  // 1. PRD 목록 조회
  console.log("Notion에서 PRD를 가져오는 중...\n");
  const pages = await getPrdPages();

  if (pages.length === 0) {
    console.log("저장된 PRD가 없습니다.\n");
  } else {
    pages.forEach((p, i) => {
      console.log(`  [${i + 1}] ${p.title}`);
    });
    console.log();
  }

  // 2. 액션 선택
  console.log("─".repeat(50));
  const action = await ask(
    "\n무엇을 하시겠습니까?\n  [1] 새 PRD 작성\n  [2] 기존 PRD 수정\n  [q] 종료\n\n선택: "
  );

  if (action === "q") {
    console.log("종료합니다.");
    rl.close();
    return;
  }

  if (action === "1") {
    // 새 PRD 작성
    const topic = await ask("\n어떤 PRD를 작성할까요?: ");
    rl.close();

    console.log("\nPRD 작성 중...\n");
    const result = await graph.invoke({
      userInput: `다음 주제로 PRD 작성해줘: ${topic}`,
    });
    console.log(result.result);
  } else if (action === "2") {
    if (pages.length === 0) {
      console.log("수정할 PRD가 없습니다.");
      rl.close();
      return;
    }

    // 기존 PRD 선택
    const pageNum = await ask(`\n수정할 PRD 번호를 선택하세요 (1-${pages.length}): `);
    const idx = parseInt(pageNum) - 1;

    if (idx < 0 || idx >= pages.length) {
      console.log("잘못된 번호입니다.");
      rl.close();
      return;
    }

    const selected = pages[idx];
    console.log(`\n선택된 PRD: ${selected.title}`);
    console.log("─".repeat(50));
    console.log(selected.content || "(내용 없음)");
    console.log("─".repeat(50));

    const instruction = await ask("\n어떻게 수정할까요?: ");
    rl.close();

    console.log("\nPRD 수정 중...\n");

    const model = new ChatOpenAI({ model: "gpt-4o-mini" });
    const response = await model.invoke([
      {
        role: "system",
        content: `너는 PRD(제품 요구사항 문서) 수정 전문가야.
기존 PRD를 사용자의 요청에 맞게 수정해.

응답은 반드시 아래 형식으로 시작해:
제목: ...
카테고리: (탐색|결제|AI|알림|캘린더|온보딩 중 하나)
우선순위: (P0|P1|P2|P3 중 하나)
목표: (한 줄 요약)

그 다음 줄부터 PRD 본문을 아래 템플릿에 맞춰 작성해:
## 1. 배경
## 2. 문제 정의
## 3. 목표
## 4. 가설
## 5. 해결 방향
## 6. 범위
## 7. 요구사항
## 8. 리스크 / 오픈 이슈

기존 내용을 최대한 유지하면서 수정 요청 부분만 반영해.`,
      },
      {
        role: "user",
        content: `기존 PRD:\n제목: ${selected.title}\n${selected.content}\n\n수정 요청: ${instruction}`,
      },
    ]);

    const text = response.content.toString();
    const titleMatch = text.match(/제목:\s*(.+)/);
    const categoryMatch = text.match(/카테고리:\s*(.+)/);
    const priorityMatch = text.match(/우선순위:\s*(.+)/);
    const goalMatch = text.match(/목표:\s*(.+)/);

    const meta = {
      title: titleMatch ? titleMatch[1].trim() : selected.title,
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

    await updatePrdPage(selected.id, meta, content);
    console.log(`PRD "${meta.title}"가 수정되었습니다.`);
  } else {
    console.log("잘못된 입력입니다.");
    rl.close();
  }
}

main().catch(console.error);
