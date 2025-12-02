import { LocalIndex } from "vectra";
import fs from "fs";
import path from "path";
import { IVectorStore } from "./vector-store.js";
import { TextChunk, SearchResult, ChunkMetadata } from "../schema.js";

/**
 * Vectra implementation of the vector store interface
 * Good for local development and small-scale deployments
 */
export class VectraStore implements IVectorStore {
    private index: LocalIndex | null = null;
    private dbPath: string;
    private collectionName: string;

    constructor(dbPath: string, collectionName: string = "tickets") {
        this.dbPath = path.resolve(dbPath);
        this.collectionName = collectionName;
    }

    async initialize(): Promise<void> {
        try {
            // Ensure the directory exists
            if (!fs.existsSync(this.dbPath)) {
                fs.mkdirSync(this.dbPath, { recursive: true });
            }

            const indexPath = path.join(this.dbPath, this.collectionName);

            // Check if index exists
            const indexExists = fs.existsSync(indexPath) && fs.existsSync(path.join(indexPath, "index.json"));

            if (indexExists) {
                // Load existing index
                this.index = new LocalIndex(indexPath);
            } else {
                // Create new index
                this.index = new LocalIndex(indexPath);
                await this.index.createIndex();
            }
        } catch (error) {
            throw new Error(`Failed to initialize Vectra: ${error}`);
        }
    }

    async upsertEmbedding(chunk: TextChunk, embedding: number[]): Promise<void> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        try {
            await this.index.insertItem({
                id: chunk.id,
                vector: embedding,
                metadata: {
                    text: chunk.text,
                    ...chunk.metadata,
                },
            });
        } catch (error) {
            throw new Error(`Failed to upsert embedding: ${error}`);
        }
    }

    async upsertBatch(chunks: TextChunk[], embeddings: number[][]): Promise<void> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        if (chunks.length !== embeddings.length) {
            throw new Error("Chunks and embeddings arrays must have the same length");
        }

        try {
            const items = chunks.map((chunk, index) => ({
                id: chunk.id,
                vector: embeddings[index],
                metadata: {
                    text: chunk.text,
                    ...chunk.metadata,
                },
            }));

            await this.index.beginUpdate();
            for (const item of items) {
                await this.index.insertItem(item);
            }
            await this.index.endUpdate();
        } catch (error) {
            throw new Error(`Failed to upsert batch: ${error}`);
        }
    }

    async metaKeywordSearch(query: string, topK: number = 10): Promise<SearchResult[]> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        try {
            // Vectra doesn't have built-in keyword search, so we'll do a simple text match
            const allItems = await this.index.listItems();
            const queryLower = query.toLowerCase();
            
            const matches: SearchResult[] = [];
            
            for (const item of allItems) {
                const metadata = item.metadata as any;
                const text = metadata.text || "";
                
                if (text.toLowerCase().includes(queryLower)) {
                    // Simple relevance score based on match position and frequency
                    const occurrences = (text.toLowerCase().match(new RegExp(queryLower, "g")) || []).length;
                    const position = text.toLowerCase().indexOf(queryLower);
                    const score = occurrences * (1 - position / text.length);
                    
                    matches.push({
                        id: item.id,
                        text: text,
                        score: Math.min(1, score),
                        metadata: this.extractMetadata(metadata),
                    });
                }
            }

            // Sort by score and return top K
            return matches
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
        } catch (error) {
            console.warn(`Keyword search failed: ${error}`);
            return [];
        }
    }

    async semanticSearch(queryEmbedding: number[], topK: number = 20, minScore: number = 0.5): Promise<SearchResult[]> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        try {
            const results = await this.index.queryItems(queryEmbedding, topK);

            return results
                .filter((result) => result.score >= minScore)
                .map((result) => {
                    const metadata = result.item.metadata as any;
                    return {
                        id: result.item.id,
                        text: metadata.text || "",
                        score: result.score,
                        metadata: this.extractMetadata(metadata),
                    };
                });
        } catch (error) {
            throw new Error(`Failed to perform semantic search: ${error}`);
        }
    }

    async hybridSearch(
        query: string,
        queryEmbedding: number[],
        keywordTopK: number = 10,
        semanticTopK: number = 20
    ): Promise<SearchResult[]> {
        // Perform both searches
        const keywordResults = await this.metaKeywordSearch(query, keywordTopK);
        const semanticResults = await this.semanticSearch(queryEmbedding, semanticTopK);

        // Combine and deduplicate results
        const resultsMap = new Map<string, SearchResult>();

        // Add keyword results with boosted scores
        keywordResults.forEach((result) => {
            resultsMap.set(result.id, {
                ...result,
                score: result.score * 1.2, // Boost keyword matches
            });
        });

        // Add semantic results, combining scores if already present
        semanticResults.forEach((result) => {
            const existing = resultsMap.get(result.id);
            if (existing) {
                // Combine scores if result exists in both
                resultsMap.set(result.id, {
                    ...result,
                    score: (existing.score + result.score) / 2,
                });
            } else {
                resultsMap.set(result.id, result);
            }
        });

        // Convert to array and sort by score
        return Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
    }

    async count(): Promise<number> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        try {
            const items = await this.index.listItems();
            return items.length;
        } catch (error) {
            throw new Error(`Failed to get collection count: ${error}`);
        }
    }

    async deleteCollection(): Promise<void> {
        if (!this.index) {
            throw new Error("Vectra not initialized. Call initialize() first.");
        }

        try {
            const indexPath = path.join(this.dbPath, this.collectionName);
            
            // Delete the index directory
            if (fs.existsSync(indexPath)) {
                fs.rmSync(indexPath, { recursive: true, force: true });
            }
            
            this.index = null;
        } catch (error) {
            throw new Error(`Failed to delete collection: ${error}`);
        }
    }

    private extractMetadata(rawMetadata: any): ChunkMetadata {
        return {
            ticketUid: rawMetadata.ticketUid,
            ticketMask: rawMetadata.ticketMask,
            ticketSubject: rawMetadata.ticketSubject,
            messageUid: rawMetadata.messageUid,
            isOutgoing: rawMetadata.isOutgoing,
            chunkIndex: rawMetadata.chunkIndex,
            totalChunks: rawMetadata.totalChunks,
            timestamp: rawMetadata.timestamp,
            groupId: rawMetadata.groupId,
            bucketId: rawMetadata.bucketId,
        };
    }
}
