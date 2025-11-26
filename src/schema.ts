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
