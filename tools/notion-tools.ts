import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

interface PrdMeta {
  title: string;
  category?: string;
  priority?: string;
  goal?: string;
}

const VALID_CATEGORIES = ["탐색", "결제", "AI", "알림", "캘린더", "온보딩"];
const VALID_PRIORITIES = ["P0", "P1", "P2", "P3"];

function parseMarkdownToBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: line.slice(4) } }],
        },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: line.slice(3) } }],
        },
      });
    } else if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: line.slice(2) } }],
        },
      });
    } else if (line.startsWith("- ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: line.slice(2) } }],
        },
      });
    } else if (line.trim() === "") {
      continue;
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line } }],
        },
      });
    }
  }

  return blocks;
}

export async function createPrdPage(meta: PrdMeta, content: string) {
  const properties: Record<string, any> = {
    "제목": {
      title: [{ text: { content: meta.title } }],
    },
    "상태": {
      select: { name: "작성중" },
    },
  };

  if (meta.category && VALID_CATEGORIES.includes(meta.category)) {
    properties["카테고리"] = { select: { name: meta.category } };
  }

  if (meta.priority && VALID_PRIORITIES.includes(meta.priority)) {
    properties["우선순위"] = { select: { name: meta.priority } };
  }

  if (meta.goal) {
    properties["목표"] = {
      rich_text: [{ text: { content: meta.goal } }],
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
    children: parseMarkdownToBlocks(content),
  });

  return page.id;
}

export async function updatePrdPage(pageId: string, meta: Partial<PrdMeta>, content: string) {
  // 기존 블록 삭제
  const existing = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
  for (const block of existing.results) {
    await notion.blocks.delete({ block_id: block.id });
  }

  // 속성 업데이트
  const properties: Record<string, any> = {};
  if (meta.title) {
    properties["제목"] = { title: [{ text: { content: meta.title } }] };
  }
  if (meta.category && VALID_CATEGORIES.includes(meta.category)) {
    properties["카테고리"] = { select: { name: meta.category } };
  }
  if (meta.priority && VALID_PRIORITIES.includes(meta.priority)) {
    properties["우선순위"] = { select: { name: meta.priority } };
  }
  if (meta.goal) {
    properties["목표"] = { rich_text: [{ text: { content: meta.goal } }] };
  }

  await notion.pages.update({ page_id: pageId, properties });

  // 새 블록 추가
  await notion.blocks.children.append({
    block_id: pageId,
    children: parseMarkdownToBlocks(content) as any,
  });

  return pageId;
}

export async function getPrdPages() {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 5,
  });

  const pages: { id: string; title: string; content: string }[] = [];
  for (const page of response.results) {
    if (!("properties" in page)) continue;

    const titleProp = page.properties["제목"];
    const title =
      titleProp?.type === "title"
        ? titleProp.title.map((t) => t.plain_text).join("")
        : "Untitled";

    const blocks = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 50,
    });

    const content = blocks.results
      .map((block) => {
        if ("paragraph" in block && block.type === "paragraph") {
          return (block as any).paragraph.rich_text
            .map((t: any) => t.plain_text)
            .join("");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    pages.push({ id: page.id, title, content });
  }

  return pages;
}
