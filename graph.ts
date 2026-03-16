import { StateGraph, START, END } from "@langchain/langgraph";
import { AppState, type AppGraphState } from "./state";
import { classifyNode } from "./nodes/classify-node";
import { generalNode } from "./nodes/general-node";
import { prdWriteNode } from "./nodes/prd-write-node";
import { prdReadNode } from "./nodes/prd-read-node";
import { jiraNode } from "./nodes/jira-node";

function routeByIntent(state: AppGraphState) {
  if (state.intent === "prd_write") return "prd_write";
  if (state.intent === "prd_read") return "prd_read";
  if (state.intent === "jira_create") return "jira_create";
  return "general";
}

export const graph = new StateGraph(AppState)
  .addNode("classify", classifyNode)
  .addNode("general", generalNode)
  .addNode("prd_write", prdWriteNode)
  .addNode("prd_read", prdReadNode)
  .addNode("jira_create", jiraNode)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeByIntent, [
    "general",
    "prd_write",
    "prd_read",
    "jira_create",
  ])
  .addEdge("general", END)
  .addEdge("prd_write", END)
  .addEdge("prd_read", END)
  .addEdge("jira_create", END)
  .compile();
