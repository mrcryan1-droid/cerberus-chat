#!/usr/bin/env node
import { program } from "commander";
import { embedDirectory } from "./commands/embed.js";
import { chatLoop } from "./commands/chat.js";
import { createVectorStore } from "./db/index.js";
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
      const vectorStore = createVectorStore(undefined, undefined, options.collection);
      const cost = new CostTracker();
      
      await embedDirectory(path, vectorStore, cost);
      
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
      const vectorStore = createVectorStore(undefined, undefined, options.collection);
      const cost = new CostTracker();
      
      await chatLoop(vectorStore, cost, { jsonOutput: program.opts().json });
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
      const vectorStore = createVectorStore(undefined, undefined, options.collection);
      await vectorStore.initialize();
      
      const count = await vectorStore.count();
      
      if (program.opts().json) {
        console.log(JSON.stringify({
          collection: options.collection,
          embeddingCount: count,
          vectorStoreType: config.storage.vectorStoreType,
          vectorDbPath: config.storage.vectorDbPath,
          sqlitePath: config.storage.sqlitePath,
        }, null, 2));
      } else {
        console.log(`\n=== Database Statistics ===`);
        console.log(`Collection: ${options.collection}`);
        console.log(`Embeddings: ${count}`);
        console.log(`Vector Store: ${config.storage.vectorStoreType}`);
        console.log(`Vector DB Path: ${config.storage.vectorDbPath}`);
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
