import OpenAI from "openai";
import { config } from "./config.js";
import { CostTracker } from "./cost-tracker.js";
import { ChatMessage } from "./schema.js";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        if (!config.openai.apiKey) {
            throw new Error("OPENAI_API_KEY not set in environment");
        }
        openaiClient = new OpenAI({
            apiKey: config.openai.apiKey,
        });
    }
    return openaiClient;
}

/**
 * Generate embeddings for text using OpenAI API
 */
export async function generateEmbedding(text: string, costTracker: CostTracker): Promise<number[]> {
    const client = getOpenAIClient();
    
    try {
        const response = await client.embeddings.create({
            model: config.openai.embeddingModel,
            input: text,
        });

        // Track token usage
        if (response.usage) {
            costTracker.addTokens(response.usage.total_tokens);
        }

        return response.data[0].embedding;
    } catch (error) {
        throw new Error(`Failed to generate embedding: ${error}`);
    }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[], costTracker: CostTracker): Promise<number[][]> {
    const client = getOpenAIClient();
    
    try {
        const response = await client.embeddings.create({
            model: config.openai.embeddingModel,
            input: texts,
        });

        // Track token usage
        if (response.usage) {
            costTracker.addTokens(response.usage.total_tokens);
        }

        return response.data.map((item) => item.embedding);
    } catch (error) {
        throw new Error(`Failed to generate embeddings: ${error}`);
    }
}

/**
 * Generate a chat completion using OpenAI API
 */
export async function generateChatCompletion(
    messages: ChatMessage[],
    costTracker: CostTracker,
    temperature?: number,
    maxTokens?: number
): Promise<string> {
    const client = getOpenAIClient();
    
    try {
        const response = await client.chat.completions.create({
            model: config.openai.chatModel,
            messages: messages as any,
            temperature: temperature ?? config.openai.temperature,
            max_tokens: maxTokens ?? config.openai.maxTokens,
        });

        // Track token usage
        if (response.usage) {
            costTracker.addTokens(response.usage.total_tokens);
        }

        return response.choices[0]?.message?.content || "";
    } catch (error) {
        throw new Error(`Failed to generate chat completion: ${error}`);
    }
}

/**
 * Generate a reranking score for a query and text chunk
 */
export async function rerankChunk(
    query: string,
    chunk: string,
    costTracker: CostTracker
): Promise<number> {
    const client = getOpenAIClient();
    
    const prompt = `${config.prompts.rerankPrompt}

Query: "${query}"

Text: "${chunk}"

On a scale of 0 to 10, how relevant is this text to the query? Respond with only a number.`;

    try {
        const response = await client.chat.completions.create({
            model: config.openai.rerankModel,
            messages: [
                { role: "system", content: "You are a relevance scoring assistant." },
                { role: "user", content: prompt },
            ],
            temperature: 0,
            max_tokens: 10,
        });

        // Track token usage
        if (response.usage) {
            costTracker.addTokens(response.usage.total_tokens);
        }

        const content = response.choices[0]?.message?.content || "0";
        const score = parseFloat(content.trim());
        
        // Normalize to 0-1 range
        return isNaN(score) ? 0 : score / 10;
    } catch (error) {
        console.warn(`Failed to rerank chunk: ${error}`);
        return 0;
    }
}

/**
 * Batch rerank multiple chunks for efficiency
 */
export async function rerankChunks(
    query: string,
    chunks: string[],
    costTracker: CostTracker
): Promise<number[]> {
    const client = getOpenAIClient();
    
    // Create a formatted list of chunks
    const chunkList = chunks
        .map((chunk, index) => `[${index}] ${chunk.substring(0, 200)}...`)
        .join("\n\n");

    const prompt = `${config.prompts.rerankPrompt}

Query: "${query}"

Text chunks:
${chunkList}

Rate each chunk's relevance to the query on a scale of 0-10. Respond with a JSON array of numbers, one for each chunk in order.`;

    try {
        const response = await client.chat.completions.create({
            model: config.openai.rerankModel,
            messages: [
                { role: "system", content: "You are a relevance scoring assistant. Respond only with a JSON array of numbers." },
                { role: "user", content: prompt },
            ],
            temperature: 0,
            max_tokens: 500,
        });

        // Track token usage
        if (response.usage) {
            costTracker.addTokens(response.usage.total_tokens);
        }

        const content = response.choices[0]?.message?.content || "[]";
        const scores = JSON.parse(content.trim());
        
        // Normalize to 0-1 range
        return scores.map((score: number) => (isNaN(score) ? 0 : score / 10));
    } catch (error) {
        console.warn(`Failed to rerank chunks in batch: ${error}`);
        // Return default scores
        return chunks.map(() => 0.5);
    }
}

/**
 * Placeholder for future image embedding functionality
 */
export async function generateImageEmbedding(imageBuffer: Buffer, costTracker: CostTracker): Promise<number[]> {
    // TODO: Implement image embedding when OpenAI supports it or integrate with another service
    throw new Error("Image embedding not yet implemented");
}
