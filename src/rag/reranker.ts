import { SearchResult, RerankResult } from "../schema.js";
import { rerankChunks } from "../openai.js";
import { CostTracker } from "../cost-tracker.js";
import { config } from "../config.js";

/**
 * Rerank search results using OpenAI to improve relevance
 */
export async function rerankWithOpenAI(
    query: string,
    results: SearchResult[],
    costTracker: CostTracker,
    topK?: number
): Promise<RerankResult[]> {
    if (results.length === 0) {
        return [];
    }

    console.log(`Reranking ${results.length} results...`);

    // Extract text from results
    const texts = results.map((r) => r.text);

    // Get rerank scores from OpenAI
    const rerankScores = await rerankChunks(query, texts, costTracker);

    // Combine original results with rerank scores
    const reranked: RerankResult[] = results.map((result, index) => ({
        id: result.id,
        text: result.text,
        score: rerankScores[index],
        originalIndex: index,
        metadata: result.metadata,
    }));

    // Sort by rerank score
    reranked.sort((a, b) => b.score - a.score);

    // Return top K results
    const finalTopK = topK ?? config.retrieval.rerankTopK;
    const topResults = reranked.slice(0, finalTopK);

    console.log(`Reranked to top ${topResults.length} results`);

    return topResults;
}

/**
 * Rerank with combined scoring (original + rerank)
 */
export async function rerankWithCombinedScoring(
    query: string,
    results: SearchResult[],
    costTracker: CostTracker,
    topK?: number,
    originalWeight: number = 0.3,
    rerankWeight: number = 0.7
): Promise<RerankResult[]> {
    if (results.length === 0) {
        return [];
    }

    console.log(`Reranking ${results.length} results with combined scoring...`);

    // Extract text from results
    const texts = results.map((r) => r.text);

    // Get rerank scores from OpenAI
    const rerankScores = await rerankChunks(query, texts, costTracker);

    // Combine scores
    const reranked: RerankResult[] = results.map((result, index) => {
        const combinedScore = originalWeight * result.score + rerankWeight * rerankScores[index];

        return {
            id: result.id,
            text: result.text,
            score: combinedScore,
            originalIndex: index,
            metadata: result.metadata,
        };
    });

    // Sort by combined score
    reranked.sort((a, b) => b.score - a.score);

    // Return top K results
    const finalTopK = topK ?? config.retrieval.rerankTopK;
    const topResults = reranked.slice(0, finalTopK);

    console.log(`Reranked to top ${topResults.length} results`);

    return topResults;
}

/**
 * Simple reranking based only on original scores (no LLM call)
 */
export function rerankByScore(results: SearchResult[], topK?: number): RerankResult[] {
    const finalTopK = topK ?? config.retrieval.rerankTopK;

    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, finalTopK)
        .map((result, index) => ({
            id: result.id,
            text: result.text,
            score: result.score,
            originalIndex: index,
            metadata: result.metadata,
        }));
}

/**
 * Diversity-aware reranking to avoid duplicate information
 */
export async function rerankWithDiversity(
    query: string,
    results: SearchResult[],
    costTracker: CostTracker,
    topK?: number,
    diversityThreshold: number = 0.8
): Promise<RerankResult[]> {
    if (results.length === 0) {
        return [];
    }

    // First, rerank with OpenAI
    const reranked = await rerankWithOpenAI(query, results, costTracker, results.length);

    // Then apply diversity filtering
    const diverse: RerankResult[] = [];
    const selectedTickets = new Set<string>();

    for (const result of reranked) {
        // Check if we already have a result from this ticket
        if (selectedTickets.has(result.metadata.ticketUid)) {
            // Only add if score is significantly higher or we have few results
            if (diverse.length < (topK ?? config.retrieval.rerankTopK) / 2) {
                diverse.push(result);
            }
        } else {
            diverse.push(result);
            selectedTickets.add(result.metadata.ticketUid);
        }

        if (diverse.length >= (topK ?? config.retrieval.rerankTopK)) {
            break;
        }
    }

    console.log(`Applied diversity filtering: ${diverse.length} diverse results from ${selectedTickets.size} tickets`);

    return diverse;
}
