import { IVectorStore } from "./vector-store.js";
import { VectraStore } from "./vectra-store.js";
import { config } from "../config.js";

/**
 * Vector store type enum
 */
export enum VectorStoreType {
    VECTRA = "vectra",
    CHROMA = "chroma",
    PINECONE = "pinecone",
}

/**
 * Factory function to create the appropriate vector store implementation
 * This makes it easy to swap between different vector databases
 */
export function createVectorStore(
    type?: VectorStoreType,
    dbPath?: string,
    collectionName?: string
): IVectorStore {
    const storeType = type || (process.env.VECTOR_STORE_TYPE as VectorStoreType) || VectorStoreType.VECTRA;
    const path = dbPath || config.storage.vectorDbPath;
    const collection = collectionName || config.storage.collectionName;

    switch (storeType) {
        case VectorStoreType.VECTRA:
            return new VectraStore(path, collection);

        case VectorStoreType.CHROMA:
            // Future: Implement ChromaDB adapter
            throw new Error("ChromaDB implementation not yet available. Use VECTRA for now.");

        case VectorStoreType.PINECONE:
            // Future: Implement Pinecone adapter
            throw new Error("Pinecone implementation not yet available. Use VECTRA for now.");

        default:
            throw new Error(`Unknown vector store type: ${storeType}`);
    }
}
