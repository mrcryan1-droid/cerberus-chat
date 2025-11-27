export interface TicketPackage {
    package: {
        name: string;
        revision: number;
        requires: {
            cerb_version: string;
            plugins: string[];
        };
        configure: {
            prompts: any[];
            placeholders: any[];
            options: Record<string, unknown>;
        };
    };
    records: (TicketRecord | MessageRecord)[];
}

export interface TicketRecord {
    uid: string;
    _context: "ticket";
    mask: string;
    subject: string;
    importance: number;
    group_id: number;
    bucket_id: number;
}

export interface MessageRecord {
    uid: string;
    _context: "message";
    ticket_id: string;
    is_outgoing: 0 | 1;
    response_time: number;
    hash_header_message_id: string;
    content: string;
}

export interface BinaryAsset {
    identifier: string;
    buffer: Buffer;
    type: string;
    sourceTicketUid: string;
    fileName?: string;
}

export interface TextChunk {
    id: string;
    text: string;
    ticketUid: string;
    ticketMask: string;
    ticketSubject: string;
    messageUid?: string;
    chunkIndex: number;
    metadata: ChunkMetadata;
}

export interface ChunkMetadata {
    ticketUid: string;
    ticketMask: string;
    ticketSubject: string;
    messageUid?: string;
    isOutgoing?: boolean;
    chunkIndex: number;
    totalChunks: number;
    timestamp?: string;
    groupId?: number;
    bucketId?: number;
}

export interface EmbeddingRecord {
    id: string;
    embedding: number[];
    text: string;
    metadata: ChunkMetadata;
}

export interface SearchResult {
    id: string;
    text: string;
    score: number;
    metadata: ChunkMetadata;
}

export interface RerankResult {
    id: string;
    text: string;
    score: number;
    originalIndex: number;
    metadata: ChunkMetadata;
}

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface ChatResponse {
    answer: string;
    sources: SearchResult[];
    tokensUsed: number;
}
