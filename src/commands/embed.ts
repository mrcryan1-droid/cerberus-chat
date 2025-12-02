import fs from "fs";
import path from "path";
import { extractTicketPackage, extractTextContent } from "../ingest/extractor.js";
import { createTextChunks, chunkByMessages } from "../ingest/chunker.js";
import { IVectorStore } from "../db/vector-store.js";
import { SQLiteDB } from "../db/sqlite.js";
import { CostTracker } from "../cost-tracker.js";
import { generateEmbeddings } from "../openai.js";
import { config } from "../config.js";
import { TicketRecord, MessageRecord, TextChunk } from "../schema.js";

/**
 * Recursively embeds all ticket JSONs in a directory.
 */
export async function embedDirectory(directory: string, vectorStore: IVectorStore, cost: CostTracker) {
    console.log(`Starting embedding process for directory: ${directory}`);
    
    // Initialize databases
    const sqlite = new SQLiteDB(config.storage.sqlitePath, config.storage.binaryAssetsPath);
    await sqlite.initialize();
    await vectorStore.initialize();

    // Get all JSON files recursively
    const ticketFiles = findTicketFiles(directory);
    console.log(`Found ${ticketFiles.length} ticket files`);

    let totalChunks = 0;
    let totalBinaries = 0;
    let processedFiles = 0;

    // Process files in batches to manage memory
    const batchSize = 10;
    for (let i = 0; i < ticketFiles.length; i += batchSize) {
        const batch = ticketFiles.slice(i, i + batchSize);
        
        for (const filePath of batch) {
            try {
                console.log(`Processing: ${path.basename(filePath)}`);
                
                // Extract ticket data and binaries
                const { data, binaries } = extractTicketPackage(filePath);
                
                // Save binaries to SQLite
                for (const binary of binaries) {
                    await sqlite.saveBinaryAsset(binary);
                    totalBinaries++;
                }

                // Find ticket and message records
                const ticketRecord = data.records.find((r) => r._context === "ticket") as TicketRecord;
                if (!ticketRecord) {
                    console.warn(`No ticket record found in ${filePath}`);
                    continue;
                }

                // Save ticket metadata
                await sqlite.saveTicketMetadata(ticketRecord);

                const messageRecords = data.records.filter((r) => r._context === "message") as MessageRecord[];
                
                // Save message metadata
                for (const message of messageRecords) {
                    await sqlite.saveMessageMetadata(message);
                }

                // Create chunks from messages
                const messages = messageRecords.map((msg) => ({
                    content: msg.content,
                    uid: msg.uid,
                    isOutgoing: msg.is_outgoing === 1,
                }));

                const chunks = chunkByMessages(messages, ticketRecord);
                
                if (chunks.length === 0) {
                    console.warn(`No chunks created for ${filePath}`);
                    continue;
                }

                // Generate embeddings in batches
                const embeddingBatchSize = 50;
                for (let j = 0; j < chunks.length; j += embeddingBatchSize) {
                    const chunkBatch = chunks.slice(j, j + embeddingBatchSize);
                    const texts = chunkBatch.map((c) => c.text);
                    
                    const embeddings = await generateEmbeddings(texts, cost);
                    
                    // Store in vector database
                    await vectorStore.upsertBatch(chunkBatch, embeddings);
                    
                    totalChunks += chunkBatch.length;
                }

                processedFiles++;
                
                if (processedFiles % 10 === 0) {
                    console.log(`Progress: ${processedFiles}/${ticketFiles.length} files processed`);
                    console.log(`  - Chunks embedded: ${totalChunks}`);
                    console.log(`  - Binaries extracted: ${totalBinaries}`);
                    console.log(`  - Tokens used: ${cost.getTokenCount()}`);
                }
            } catch (error) {
                console.error(`Error processing ${filePath}:`, error);
            }
        }
    }

    await sqlite.close();

    console.log("\n=== Embedding Complete ===");
    console.log(`Files processed: ${processedFiles}/${ticketFiles.length}`);
    console.log(`Total chunks embedded: ${totalChunks}`);
    console.log(`Total binaries extracted: ${totalBinaries}`);
    console.log(`Total tokens used: ${cost.getTokenCount()}`);
    console.log(`Collection size: ${await vectorStore.count()}`);
}

/**
 * Recursively find all JSON files in a directory
 */
function findTicketFiles(directory: string): string[] {
    const files: string[] = [];

    function walk(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".json")) {
                files.push(fullPath);
            }
        }
    }

    walk(directory);
    return files;
}
