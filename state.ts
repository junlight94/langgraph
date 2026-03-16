import { Annotation } from "@langchain/langgraph";

export const AppState = Annotation.Root({
  userInput: Annotation<string>,
  intent: Annotation<"general" | "prd_write" | "prd_read" | "jira_create" | undefined>,
  result: Annotation<string | undefined>,
});

export type AppGraphState = typeof AppState.State;
