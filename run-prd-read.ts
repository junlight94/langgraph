import "dotenv/config";
import { graph } from "./graph";

async function main() {
  const result = await graph.invoke({
    userInput: "PRD 가져와서 요약해줘",
  });

  console.log(result.result);
}

main().catch(console.error);
