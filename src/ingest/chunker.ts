import { TextChunk, ChunkMetadata, TicketRecord } from "../schema.js";
import { config } from "../config.js";

/**
 * Split text into chunks with word-based overlap
 */
export function chunkText(
    text: string,
    chunkSize: number = config.chunking.chunkSize,
    overlap: number = config.chunking.overlap
): string[] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const chunks: string[] = [];
    
    if (words.length === 0) {
        return chunks;
    }

    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        const chunk = words.slice(start, end).join(" ");
        
        // Only add chunks that meet minimum size requirement
        if (chunk.length >= config.chunking.minChunkSize) {
            chunks.push(chunk);
        }
        
        // Move forward by (chunkSize - overlap) words
        // If we're at the end, break to avoid infinite loop
        if (end === words.length) {
            break;
        }
        
        start += Math.max(1, chunkSize - overlap);
    }
    
    return chunks;
}

/**
 * Create structured text chunks with metadata from ticket data
 */
export function createTextChunks(
    text: string,
    ticketRecord: TicketRecord,
    messageUid?: string,
    isOutgoing?: boolean
): TextChunk[] {
    const chunkTexts = chunkText(text);
    const chunks: TextChunk[] = [];

    chunkTexts.forEach((chunkText, index) => {
        const metadata: ChunkMetadata = {
            ticketUid: ticketRecord.uid,
            ticketMask: ticketRecord.mask,
            ticketSubject: ticketRecord.subject,
            messageUid,
            isOutgoing,
            chunkIndex: index,
            totalChunks: chunkTexts.length,
            groupId: ticketRecord.group_id,
            bucketId: ticketRecord.bucket_id,
        };

        const chunkId = messageUid
            ? `${ticketRecord.uid}_${messageUid}_chunk_${index}`
            : `${ticketRecord.uid}_chunk_${index}`;

        chunks.push({
            id: chunkId,
            text: chunkText,
            ticketUid: ticketRecord.uid,
            ticketMask: ticketRecord.mask,
            ticketSubject: ticketRecord.subject,
            messageUid,
            chunkIndex: index,
            metadata,
        });
    });

    return chunks;
}

/**
 * Smart chunking that preserves message boundaries when possible
 */
export function chunkByMessages(
    messages: Array<{ content: string; uid: string; isOutgoing: boolean }>,
    ticketRecord: TicketRecord
): TextChunk[] {
    const allChunks: TextChunk[] = [];

    messages.forEach((message) => {
        const chunks = createTextChunks(
            message.content,
            ticketRecord,
            message.uid,
            message.isOutgoing
        );
        allChunks.push(...chunks);
    });

    return allChunks;
}
