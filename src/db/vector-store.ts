import { TextChunk, SearchResult } from "../schema.js";

/**
 * Abstract interface for vector database operations
 * This allows swapping between different vector DB implementations (Vectra, ChromaDB, Pinecone, etc.)
 */
export interface IVectorStore {
    /**
     * Initialize the vector store connection/collection
     */
    initialize(): Promise<void>;

    /**
     * Insert or update a single embedding
     */
    upsertEmbedding(chunk: TextChunk, embedding: number[]): Promise<void>;

    /**
     * Insert or update multiple embeddings in batch
     */
    upsertBatch(chunks: TextChunk[], embeddings: number[][]): Promise<void>;

    /**
     * Search using keyword/metadata matching
     */
    metaKeywordSearch(query: string, topK?: number): Promise<SearchResult[]>;

    /**
     * Search using semantic similarity
     */
    semanticSearch(queryEmbedding: number[], topK?: number, minScore?: number): Promise<SearchResult[]>;

    /**
     * Combined keyword and semantic search
     */
    hybridSearch(
        query: string,
        queryEmbedding: number[],
        keywordTopK?: number,
        semanticTopK?: number
    ): Promise<SearchResult[]>;

    /**
     * Get the total number of vectors in the collection
     */
    count(): Promise<number>;

    /**
     * Delete the entire collection
     */
    deleteCollection(): Promise<void>;
}
