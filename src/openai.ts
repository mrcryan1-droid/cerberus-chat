/**
 * OpenAI API Key/params sourced from environment:
 * - OPENAI_API_KEY
 * - OPENAI_EMBEDDING_MODEL
 * - OPENAI_CHAT_MODEL
 */
export function getOpenAIKey(): string {
    return process.env.OPENAI_API_KEY || "";
}
// Add other helpers as needed
