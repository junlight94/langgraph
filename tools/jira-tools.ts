const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
const JIRA_EMAIL = process.env.JIRA_EMAIL!;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY!;

const headers = {
  Authorization:
    "Basic " +
    Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64"),
  "Content-Type": "application/json",
};

export interface JiraSubTask {
  summary: string;
  description: string;
  priority?: string;
}

export interface JiraIssue {
  summary: string;
  description: string;
  issueType?: string;
  priority?: string;
  subtasks?: JiraSubTask[];
}

// 마크다운을 Atlassian Document Format으로 변환
function markdownToAdf(md: string) {
  const lines = md.split("\n");
  const content: any[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: line.slice(3) }],
      });
    } else if (line.startsWith("### ")) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: line.slice(4) }],
      });
    } else if (line.startsWith("- [ ] ")) {
      content.push({
        type: "taskList",
        attrs: { localId: crypto.randomUUID() },
        content: [
          {
            type: "taskItem",
            attrs: { localId: crypto.randomUUID(), state: "TODO" },
            content: [{ type: "text", text: line.slice(6) }],
          },
        ],
      });
    } else if (line.startsWith("- ")) {
      content.push({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: line.slice(2) }],
              },
            ],
          },
        ],
      });
    } else if (line.trim() === "") {
      continue;
    } else {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }

  return { type: "doc", version: 1, content };
}

export async function createJiraIssue(issue: JiraIssue) {
  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: issue.summary,
      description: markdownToAdf(issue.description),
      issuetype: { name: issue.issueType || "Story" },
      ...(issue.priority ? { priority: { name: issue.priority } } : {}),
    },
  };

  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`JIRA 이슈 생성 실패: ${err}`);
  }

  const data = await res.json();
  return {
    key: data.key as string,
    id: data.id as string,
    url: `${JIRA_BASE_URL}/browse/${data.key}`,
  };
}

async function createJiraSubTask(
  parentKey: string,
  subtask: JiraSubTask
) {
  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      parent: { key: parentKey },
      summary: subtask.summary,
      description: markdownToAdf(subtask.description),
      issuetype: { name: "Subtask" },
      ...(subtask.priority ? { priority: { name: subtask.priority } } : {}),
    },
  };

  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`JIRA 하위 태스크 생성 실패: ${err}`);
  }

  const data = await res.json();
  return {
    key: data.key as string,
    url: `${JIRA_BASE_URL}/browse/${data.key}`,
  };
}

export async function createJiraIssuesWithSubtasks(issues: JiraIssue[]) {
  const results: {
    key: string;
    url: string;
    summary: string;
    subtasks: { key: string; url: string; summary: string }[];
  }[] = [];

  for (const issue of issues) {
    const parent = await createJiraIssue(issue);
    const subtaskResults: { key: string; url: string; summary: string }[] = [];

    if (issue.subtasks?.length) {
      for (const sub of issue.subtasks) {
        const result = await createJiraSubTask(parent.key, sub);
        subtaskResults.push({ ...result, summary: sub.summary });
      }
    }

    results.push({
      key: parent.key,
      url: parent.url,
      summary: issue.summary,
      subtasks: subtaskResults,
    });
  }

  return results;
}
