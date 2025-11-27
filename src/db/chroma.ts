import { ChromaClient, Collection } from "chromadb";
import { TextChunk, SearchResult, ChunkMetadata } from "../schema.js";
import fs from "fs";
import path from "path";

export class ChromaDB {
    private client: ChromaClient;
    private collection: Collection | null = null;
    private dbPath: string;
    private collectionName: string;

    constructor(dbPath: string, collectionName: string = "tickets") {
        this.dbPath = dbPath;
        this.collectionName = collectionName;
        
        // Ensure the directory exists
        if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
        }
        
        // Initialize ChromaDB client with persistence
        this.client = new ChromaClient({
            path: dbPath,
        });
    }

    async initialize(): Promise<void> {
        try {
            // Try to get existing collection
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                metadata: { 
                    description: "Support ticket embeddings",
                    "hnsw:space": "cosine" 
                },
            });
        } catch (error) {
            throw new Error(`Failed to initialize ChromaDB: ${error}`);
        }
    }

    async upsertEmbedding(chunk: TextChunk, embedding: number[]): Promise<void> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        try {
            await this.collection.upsert({
                ids: [chunk.id],
                embeddings: [embedding],
                metadatas: [chunk.metadata as any],
                documents: [chunk.text],
            });
        } catch (error) {
            throw new Error(`Failed to upsert embedding: ${error}`);
        }
    }

    async upsertBatch(chunks: TextChunk[], embeddings: number[][]): Promise<void> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        if (chunks.length !== embeddings.length) {
            throw new Error("Chunks and embeddings arrays must have the same length");
        }

        try {
            await this.collection.upsert({
                ids: chunks.map((c) => c.id),
                embeddings: embeddings,
                metadatas: chunks.map((c) => c.metadata as any),
                documents: chunks.map((c) => c.text),
            });
        } catch (error) {
            throw new Error(`Failed to upsert batch: ${error}`);
        }
    }

    async metaKeywordSearch(query: string, topK: number = 10): Promise<SearchResult[]> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        try {
            // Search using where_document for text matching
            const results = await this.collection.query({
                queryTexts: [query],
                nResults: topK,
                whereDocument: {
                    $contains: query
                }
            });

            return this.formatResults(results);
        } catch (error) {
            // If keyword search fails, return empty array
            console.warn(`Keyword search failed: ${error}`);
            return [];
        }
    }

    async semanticSearch(queryEmbedding: number[], topK: number = 20, minScore: number = 0.5): Promise<SearchResult[]> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        try {
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: topK,
            });

            const formattedResults = this.formatResults(results);
            
            // Filter by minimum similarity score (convert distance to similarity if needed)
            return formattedResults.filter(r => r.score >= minScore);
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
        return Array.from(resultsMap.values())
            .sort((a, b) => b.score - a.score);
    }

    private formatResults(results: any): SearchResult[] {
        if (!results.ids || !results.ids[0]) {
            return [];
        }

        const ids = results.ids[0];
        const documents = results.documents?.[0] || [];
        const distances = results.distances?.[0] || [];
        const metadatas = results.metadatas?.[0] || [];

        return ids.map((id: string, index: number) => {
            // Convert distance to similarity score (1 - distance for cosine)
            const distance = distances[index] || 0;
            const score = Math.max(0, 1 - distance);

            return {
                id,
                text: documents[index] || "",
                score,
                metadata: metadatas[index] as ChunkMetadata,
            };
        });
    }

    async count(): Promise<number> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        try {
            const count = await this.collection.count();
            return count;
        } catch (error) {
            throw new Error(`Failed to get collection count: ${error}`);
        }
    }

    async deleteCollection(): Promise<void> {
        if (!this.collection) {
            throw new Error("ChromaDB not initialized. Call initialize() first.");
        }

        try {
            await this.client.deleteCollection({ name: this.collectionName });
            this.collection = null;
        } catch (error) {
            throw new Error(`Failed to delete collection: ${error}`);
        }
    }
}
