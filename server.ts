import "dotenv/config";
import express from "express";
import fs from "fs";
import { graph } from "./graph";
import { getPrdPages, updatePrdPage } from "./tools/notion-tools";
import { ChatOpenAI } from "@langchain/openai";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// PRD 목록 조회
app.get("/api/prd", async (_req, res) => {
  try {
    const pages = await getPrdPages();
    res.json(pages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PRD 새로 작성
app.post("/api/prd", async (req, res) => {
  try {
    const { topic } = req.body;
    const result = await graph.invoke({
      userInput: `다음 주제로 PRD 작성해줘: ${topic}`,
    });
    res.json({ result: result.result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PRD 수정
app.put("/api/prd/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, instruction } = req.body;

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
        content: `기존 PRD:\n제목: ${title}\n${content}\n\n수정 요청: ${instruction}`,
      },
    ]);

    const text = response.content.toString();
    const titleMatch = text.match(/제목:\s*(.+)/);
    const categoryMatch = text.match(/카테고리:\s*(.+)/);
    const priorityMatch = text.match(/우선순위:\s*(.+)/);
    const goalMatch = text.match(/목표:\s*(.+)/);

    const meta = {
      title: titleMatch ? titleMatch[1].trim() : title,
      category: categoryMatch ? categoryMatch[1].trim() : undefined,
      priority: priorityMatch ? priorityMatch[1].trim() : undefined,
      goal: goalMatch ? goalMatch[1].trim() : undefined,
    };

    const newContent = text
      .replace(/제목:\s*.+\n?/, "")
      .replace(/카테고리:\s*.+\n?/, "")
      .replace(/우선순위:\s*.+\n?/, "")
      .replace(/목표:\s*.+\n?/, "")
      .trim();

    await updatePrdPage(id, meta, newContent);
    res.json({ result: `PRD "${meta.title}"가 수정되었습니다.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PRD 기반 JIRA 이슈 생성
app.post("/api/jira", async (req, res) => {
  try {
    const { prdTitle, prdContent } = req.body;
    const result = await graph.invoke({
      userInput: `다음 PRD를 기반으로 JIRA 이슈 티켓을 만들어줘:\n\n제목: ${prdTitle}\n${prdContent}`,
    });
    res.json({ result: result.result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 일반 질문
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const result = await graph.invoke({ userInput: message });
    res.json({ result: result.result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const ENV_PATH = path.join(__dirname, ".env");

const ENV_KEYS = [
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", group: "OpenAI" },
  { key: "NOTION_API_KEY", label: "Notion API Key", group: "Notion" },
  { key: "NOTION_DATABASE_ID", label: "Notion Database ID", group: "Notion" },
  { key: "JIRA_BASE_URL", label: "JIRA Base URL", group: "JIRA" },
  { key: "JIRA_EMAIL", label: "JIRA Email", group: "JIRA" },
  { key: "JIRA_API_TOKEN", label: "JIRA API Token", group: "JIRA" },
  { key: "JIRA_PROJECT_KEY", label: "JIRA Project Key", group: "JIRA" },
];

function parseEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function writeEnvFile(values: Record<string, string>) {
  const lines = Object.entries(values)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");

  // 런타임 환경변수도 업데이트
  for (const [k, v] of Object.entries(values)) {
    if (v) process.env[k] = v;
  }
}

// 설정 조회 (값은 마스킹)
app.get("/api/settings", (_req, res) => {
  const values = parseEnvFile();
  const settings = ENV_KEYS.map(({ key, label, group }) => {
    const raw = values[key] || "";
    const masked = raw.length > 8
      ? raw.slice(0, 4) + "•".repeat(Math.min(raw.length - 8, 20)) + raw.slice(-4)
      : raw ? "•".repeat(raw.length) : "";
    return { key, label, group, masked, hasValue: !!raw };
  });
  res.json(settings);
});

// 설정 저장
app.put("/api/settings", (req, res) => {
  const updates: Record<string, string> = req.body;
  const current = parseEnvFile();

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== "") {
      current[key] = value;
    }
  }

  writeEnvFile(current);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n  LangGraph PRD Manager`);
  console.log(`  http://localhost:${PORT}\n`);
});
