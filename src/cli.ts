#!/usr/bin/env node
import { program } from "commander";
import { embedDirectory } from "./commands/embed";
import { chatLoop } from "./commands/chat";
import { ChromaDB } from "./db/chroma";
import { CostTracker } from "./cost-tracker";

program
  .option("--json", "Output results in JSON");

program
  .command("embed <path>")
  .description("Embed all tickets in a directory")
  .action(async (path, options) => {
    const chroma = new ChromaDB("./chromadb");
    const cost = new CostTracker();
    await embedDirectory(path, chroma, cost);
    if (program.opts().json) {
      console.log(JSON.stringify({ totalTokens: cost.getTokenCount() }, null, 2));
    } else {
      console.log(`Total tokens used: ${cost.getTokenCount()}`);
    }
  });

program
  .command("chat")
  .description("Start chat interface")
  .action(async () => {
    const chroma = new ChromaDB("./chromadb");
    const cost = new CostTracker();
    await chatLoop(chroma, cost, { jsonOutput: program.opts().json });
  });

program.parseAsync(process.argv);
