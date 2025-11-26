import { ChromaDB } from "../db/chroma";
import { CostTracker } from "../cost-tracker";

/**
 * Interactive chat interface using RAG pipeline.
 */
export async function chatLoop(chroma: ChromaDB, cost: CostTracker, opts: { jsonOutput: boolean }) {
    // Implement CLI chat loop
}
