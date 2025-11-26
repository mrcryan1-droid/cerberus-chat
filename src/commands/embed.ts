import { extractTicketPackage } from "../ingest/extractor";
import { chunkText } from "../ingest/chunker";
import { ChromaDB } from "../db/chroma";
import { CostTracker } from "../cost-tracker";

/**
 * Recursively embeds all ticket JSONs in a directory.
 */
export async function embedDirectory(directory: string, chroma: ChromaDB, cost: CostTracker) {
    // Walk dir, extract, chunk, embed, persist. Track token cost.
    // Placeholder for best practice
}
