#!/usr/bin/env node
import { program } from "commander";
import { embedDirectory } from "./commands/embed.js";
import { chatLoop } from "./commands/chat.js";
import { ChromaDB } from "./db/chroma.js";
import { CostTracker } from "./cost-tracker.js";
import { config } from "./config.js";

program
  .version("0.1.0")
  .description("Cerberus Chat - RAG system for support ticket analysis")
  .option("--json", "Output results in JSON");

program
  .command("embed <path>")
  .description("Embed all tickets in a directory")
  .option("-c, --collection <name>", "Collection name", config.storage.collectionName)
  .action(async (path, options) => {
    try {
      const chroma = new ChromaDB(config.storage.chromaPath, options.collection);
      const cost = new CostTracker();
      
      await embedDirectory(path, chroma, cost);
      
      if (program.opts().json) {
        console.log(JSON.stringify({ 
          success: true,
          totalTokens: cost.getTokenCount(),
          collectionName: options.collection,
        }, null, 2));
      } else {
        console.log(`\n✓ Embedding completed successfully`);
        console.log(`Total tokens used: ${cost.getTokenCount()}`);
      }
    } catch (error) {
      if (program.opts().json) {
        console.error(JSON.stringify({ success: false, error: String(error) }, null, 2));
      } else {
        console.error(`\n✗ Error: ${error}`);
      }
      process.exit(1);
    }
  });

program
  .command("chat")
  .description("Start interactive chat interface")
  .option("-c, --collection <name>", "Collection name", config.storage.collectionName)
  .action(async (options) => {
    try {
      const chroma = new ChromaDB(config.storage.chromaPath, options.collection);
      const cost = new CostTracker();
      
      await chatLoop(chroma, cost, { jsonOutput: program.opts().json });
    } catch (error) {
      if (program.opts().json) {
        console.error(JSON.stringify({ success: false, error: String(error) }, null, 2));
      } else {
        console.error(`\n✗ Error: ${error}`);
      }
      process.exit(1);
    }
  });

program
  .command("stats")
  .description("Show database statistics")
  .option("-c, --collection <name>", "Collection name", config.storage.collectionName)
  .action(async (options) => {
    try {
      const chroma = new ChromaDB(config.storage.chromaPath, options.collection);
      await chroma.initialize();
      
      const count = await chroma.count();
      
      if (program.opts().json) {
        console.log(JSON.stringify({
          collection: options.collection,
          embeddingCount: count,
          chromaPath: config.storage.chromaPath,
          sqlitePath: config.storage.sqlitePath,
        }, null, 2));
      } else {
        console.log(`\n=== Database Statistics ===`);
        console.log(`Collection: ${options.collection}`);
        console.log(`Embeddings: ${count}`);
        console.log(`Chroma Path: ${config.storage.chromaPath}`);
        console.log(`SQLite Path: ${config.storage.sqlitePath}`);
      }
    } catch (error) {
      if (program.opts().json) {
        console.error(JSON.stringify({ success: false, error: String(error) }, null, 2));
      } else {
        console.error(`\n✗ Error: ${error}`);
      }
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
