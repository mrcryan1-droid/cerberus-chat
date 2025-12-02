import readline from "readline";
import { IVectorStore } from "../db/vector-store.js";
import { CostTracker } from "../cost-tracker.js";
import { retrieveRelevantChunks } from "../rag/selector.js";
import { rerankWithDiversity } from "../rag/reranker.js";
import { generateChatCompletion } from "../openai.js";
import { ChatMessage, ChatResponse } from "../schema.js";
import { config } from "../config.js";

/**
 * Interactive chat interface using RAG pipeline.
 */
export async function chatLoop(vectorStore: IVectorStore, cost: CostTracker, opts: { jsonOutput: boolean }) {
    // Initialize vector store
    await vectorStore.initialize();

    const collectionCount = await vectorStore.count();
    
    if (!opts.jsonOutput) {
        console.log("\n=== Cerberus Chat ===");
        console.log(`Connected to collection with ${collectionCount} embeddings`);
        console.log("Type your questions or 'exit' to quit\n");
    }

    if (collectionCount === 0) {
        console.error("Error: No embeddings found. Please run the 'embed' command first.");
        process.exit(1);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: opts.jsonOutput ? "" : "You: ",
    });

    // Keep conversation history for context
    const conversationHistory: ChatMessage[] = [
        {
            role: "system",
            content: config.prompts.systemPrompt,
        },
    ];

    if (!opts.jsonOutput) {
        rl.prompt();
    }

    rl.on("line", async (line: string) => {
        const query = line.trim();

        if (!query) {
            if (!opts.jsonOutput) {
                rl.prompt();
            }
            return;
        }

        if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
            if (!opts.jsonOutput) {
                console.log("\nGoodbye!");
                console.log(`Total tokens used in this session: ${cost.getTokenCount()}`);
            }
            rl.close();
            process.exit(0);
        }

        if (query.toLowerCase() === "reset") {
            conversationHistory.length = 1; // Keep only system message
            cost.reset();
            if (!opts.jsonOutput) {
                console.log("\nConversation history cleared.\n");
                rl.prompt();
            }
            return;
        }

        if (query.toLowerCase() === "stats") {
            if (!opts.jsonOutput) {
                console.log(`\nSession Statistics:`);
                console.log(`  - Tokens used: ${cost.getTokenCount()}`);
                console.log(`  - Messages in history: ${conversationHistory.length - 1}`);
                console.log(`  - Collection size: ${collectionCount}\n`);
                rl.prompt();
            }
            return;
        }

        try {
            const response = await processQuery(query, vectorStore, cost, conversationHistory);

            if (opts.jsonOutput) {
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.log(`\nAssistant: ${response.answer}\n`);
                
                if (response.sources.length > 0) {
                    console.log("Sources:");
                    response.sources.forEach((source, index) => {
                        console.log(`  ${index + 1}. Ticket ${source.metadata.ticketMask}: ${source.metadata.ticketSubject}`);
                        console.log(`     Score: ${source.score.toFixed(3)}`);
                    });
                    console.log();
                }
                
                console.log(`Tokens used: ${response.tokensUsed}\n`);
                rl.prompt();
            }
        } catch (error) {
            if (opts.jsonOutput) {
                console.log(JSON.stringify({ error: String(error) }, null, 2));
            } else {
                console.error(`\nError: ${error}\n`);
                rl.prompt();
            }
        }
    });

    rl.on("close", () => {
        if (!opts.jsonOutput) {
            console.log("\nGoodbye!");
        }
        process.exit(0);
    });
}

/**
 * Process a single query through the RAG pipeline
 */
async function processQuery(
    query: string,
    vectorStore: IVectorStore,
    cost: CostTracker,
    conversationHistory: ChatMessage[]
): Promise<ChatResponse> {
    const startTokens = cost.getTokenCount();

    // Step 1: Retrieve relevant chunks (two-phase search)
    const retrievedChunks = await retrieveRelevantChunks(query, vectorStore, cost);

    if (retrievedChunks.length === 0) {
        return {
            answer: "I couldn't find any relevant information in the ticket database to answer your question.",
            sources: [],
            tokensUsed: cost.getTokenCount() - startTokens,
        };
    }

    // Step 2: Rerank chunks for relevance and diversity
    const rerankedChunks = await rerankWithDiversity(query, retrievedChunks, cost);

    // Step 3: Build context from top chunks
    const context = rerankedChunks
        .map((chunk, index) => {
            return `[Source ${index + 1} - Ticket ${chunk.metadata.ticketMask}]\n${chunk.text}`;
        })
        .join("\n\n---\n\n");

    // Step 4: Build prompt with context
    const promptWithContext = config.prompts.answerPrompt
        .replace("{context}", context)
        .replace("{question}", query);

    // Step 5: Add to conversation history
    conversationHistory.push({
        role: "user",
        content: promptWithContext,
    });

    // Step 6: Generate answer
    const answer = await generateChatCompletion(conversationHistory, cost);

    // Step 7: Add assistant response to history
    conversationHistory.push({
        role: "assistant",
        content: answer,
    });

    // Step 8: Keep conversation history manageable (last 10 exchanges)
    if (conversationHistory.length > 21) {
        // Keep system message + last 10 exchanges (20 messages)
        conversationHistory.splice(1, conversationHistory.length - 21);
    }

    const tokensUsed = cost.getTokenCount() - startTokens;

    return {
        answer,
        sources: rerankedChunks,
        tokensUsed,
    };
}

/**
 * Process a single query without conversation history (stateless)
 */
export async function processQueryStateless(
    query: string,
    vectorStore: IVectorStore,
    cost: CostTracker
): Promise<ChatResponse> {
    const conversationHistory: ChatMessage[] = [
        {
            role: "system",
            content: config.prompts.systemPrompt,
        },
    ];

    return await processQuery(query, vectorStore, cost, conversationHistory);
}
