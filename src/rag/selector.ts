import { ChromaDB } from "../db/chroma.js";
import { SQLiteDB } from "../db/sqlite.js";
import { SearchResult } from "../schema.js";
import { generateEmbedding } from "../openai.js";
import { CostTracker } from "../cost-tracker.js";
import { config } from "../config.js";

/**
 * Two-phase retrieval: keyword/metadata search + semantic search
 */
export async function retrieveRelevantChunks(
    query: string,
    chroma: ChromaDB,
    costTracker: CostTracker
): Promise<SearchResult[]> {
    console.log(`Retrieving relevant chunks for query: "${query}"`);

    // Phase 1: Generate query embedding for semantic search
    const queryEmbedding = await generateEmbedding(query, costTracker);

    // Phase 2: Perform hybrid search (combines keyword and semantic)
    const results = await chroma.hybridSearch(
        query,
        queryEmbedding,
        config.retrieval.keywordTopK,
        config.retrieval.semanticTopK
    );

    console.log(`Retrieved ${results.length} candidate chunks`);

    // Filter by minimum similarity score
    const filtered = results.filter((r) => r.score >= config.retrieval.minSimilarityScore);

    console.log(`Filtered to ${filtered.length} chunks meeting minimum score threshold`);

    return filtered;
}

/**
 * Retrieve chunks using only semantic search
 */
export async function retrieveSemanticChunks(
    query: string,
    chroma: ChromaDB,
    costTracker: CostTracker,
    topK?: number
): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbedding(query, costTracker);
    
    return await chroma.semanticSearch(
        queryEmbedding,
        topK ?? config.retrieval.semanticTopK,
        config.retrieval.minSimilarityScore
    );
}

/**
 * Retrieve chunks using only keyword/metadata search
 */
export async function retrieveKeywordChunks(
    query: string,
    chroma: ChromaDB,
    topK?: number
): Promise<SearchResult[]> {
    return await chroma.metaKeywordSearch(query, topK ?? config.retrieval.keywordTopK);
}

/**
 * Enhanced retrieval with ticket metadata filtering
 */
export async function retrieveWithMetadataFilter(
    query: string,
    chroma: ChromaDB,
    costTracker: CostTracker,
    sqlite: SQLiteDB,
    filters?: {
        groupId?: number;
        bucketId?: number;
        ticketMask?: string;
    }
): Promise<SearchResult[]> {
    // First, get all relevant chunks
    const chunks = await retrieveRelevantChunks(query, chroma, costTracker);

    // Apply metadata filters if provided
    if (!filters) {
        return chunks;
    }

    return chunks.filter((chunk) => {
        const metadata = chunk.metadata;

        if (filters.groupId !== undefined && metadata.groupId !== filters.groupId) {
            return false;
        }

        if (filters.bucketId !== undefined && metadata.bucketId !== filters.bucketId) {
            return false;
        }

        if (filters.ticketMask && !metadata.ticketMask.includes(filters.ticketMask)) {
            return false;
        }

        return true;
    });
}

/**
 * Get similar tickets based on a ticket ID
 */
export async function findSimilarTickets(
    ticketUid: string,
    chroma: ChromaDB,
    costTracker: CostTracker,
    topK: number = 5
): Promise<SearchResult[]> {
    // First, retrieve some chunks from the ticket to use as query
    const queryEmbedding = await generateEmbedding(ticketUid, costTracker);
    
    const results = await chroma.semanticSearch(queryEmbedding, topK * 3);

    // Filter out chunks from the same ticket and group by ticket
    const ticketScores = new Map<string, { score: number; chunks: SearchResult[] }>();

    results.forEach((result) => {
        if (result.metadata.ticketUid === ticketUid) {
            return; // Skip same ticket
        }

        const existingTicket = ticketScores.get(result.metadata.ticketUid);
        if (existingTicket) {
            existingTicket.score = Math.max(existingTicket.score, result.score);
            existingTicket.chunks.push(result);
        } else {
            ticketScores.set(result.metadata.ticketUid, {
                score: result.score,
                chunks: [result],
            });
        }
    });

    // Get top K tickets by score
    const topTickets = Array.from(ticketScores.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, topK);

    // Return the best chunk from each ticket
    return topTickets.map(([ticketUid, { chunks }]) => chunks[0]);
}
