import dotenv from "dotenv";

dotenv.config();

export interface RAGConfig {
  openai: OpenAIConfig;
  chunking: ChunkingConfig;
  retrieval: RetrievalConfig;
  storage: StorageConfig;
  prompts: PromptsConfig;
}

export interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
  chatModel: string;
  rerankModel: string;
  temperature: number;
  maxTokens: number;
}

export interface ChunkingConfig {
  chunkSize: number;
  overlap: number;
  minChunkSize: number;
}

export interface RetrievalConfig {
  semanticTopK: number;
  keywordTopK: number;
  rerankTopK: number;
  minSimilarityScore: number;
}

export interface StorageConfig {
  chromaPath: string;
  sqlitePath: string;
  binaryAssetsPath: string;
  collectionName: string;
}

export interface PromptsConfig {
  systemPrompt: string;
  rerankPrompt: string;
  answerPrompt: string;
}

const defaultSystemPrompt = `You are a helpful support assistant with access to historical support ticket data.
Your role is to answer questions based on the provided ticket context.
Be precise, professional, and cite relevant ticket information when possible.
If you don't have enough information, say so clearly.`;

const defaultRerankPrompt = `Given the user query and a list of text chunks from support tickets, 
rank the chunks by relevance to answering the query.
Return only the indices of the chunks in order of relevance (most relevant first).`;

const defaultAnswerPrompt = `Based on the following support ticket information, answer the user's question.

Context from tickets:
{context}

User question: {question}

Answer:`;

export function loadConfig(): RAGConfig {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || "",
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4",
      rerankModel: process.env.OPENAI_RERANK_MODEL || "gpt-4",
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "2000", 10),
    },
    chunking: {
      chunkSize: parseInt(process.env.CHUNK_SIZE || "500", 10),
      overlap: parseInt(process.env.CHUNK_OVERLAP || "128", 10),
      minChunkSize: parseInt(process.env.MIN_CHUNK_SIZE || "50", 10),
    },
    retrieval: {
      semanticTopK: parseInt(process.env.SEMANTIC_TOP_K || "20", 10),
      keywordTopK: parseInt(process.env.KEYWORD_TOP_K || "10", 10),
      rerankTopK: parseInt(process.env.RERANK_TOP_K || "5", 10),
      minSimilarityScore: parseFloat(process.env.MIN_SIMILARITY_SCORE || "0.5"),
    },
    storage: {
      chromaPath: process.env.CHROMA_PATH || "./chromadb",
      sqlitePath: process.env.SQLITE_PATH || "./data/metadata.db",
      binaryAssetsPath: process.env.BINARY_ASSETS_PATH || "./data/assets",
      collectionName: process.env.COLLECTION_NAME || "tickets",
    },
    prompts: {
      systemPrompt: process.env.SYSTEM_PROMPT || defaultSystemPrompt,
      rerankPrompt: process.env.RERANK_PROMPT || defaultRerankPrompt,
      answerPrompt: process.env.ANSWER_PROMPT || defaultAnswerPrompt,
    },
  };
}

export const config = loadConfig();
