import fs from "fs";
import path from "path";
import crypto from "crypto";
import { TicketPackage, BinaryAsset, MessageRecord } from "../schema.js";

/**
 * Regex patterns for detecting base64 encoded images
 */
const BASE64_IMAGE_PATTERNS = [
    // HTML img tags with base64 data
    /<img[^>]+src=["']data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,([A-Za-z0-9+/=]+)["'][^>]*>/gi,
    // Standalone data URI
    /data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,([A-Za-z0-9+/=]+)/gi,
    // Base64 blocks (common in email encodings)
    /\[image:\s*([A-Za-z0-9+/=]{100,})\]/gi,
];

/**
 * Extracts ticket package and binary assets from a file path.
 */
export function extractTicketPackage(filePath: string): { data: TicketPackage; binaries: BinaryAsset[] } {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as TicketPackage;
    const binaries: BinaryAsset[] = [];

    // Find the ticket record
    const ticketRecord = data.records.find((r) => r._context === "ticket");
    if (!ticketRecord) {
        return { data, binaries };
    }

    // Extract binaries from all message content
    data.records.forEach((record) => {
        if (record._context === "message") {
            const messageRecord = record as MessageRecord;
            const extractedBinaries = extractBinariesFromContent(
                messageRecord.content,
                ticketRecord.uid
            );
            
            // Replace base64 content with placeholders in the message
            let cleanedContent = messageRecord.content;
            extractedBinaries.forEach((binary) => {
                cleanedContent = cleanedContent.replace(
                    binary.buffer.toString("base64"),
                    `[BINARY_ASSET:${binary.identifier}]`
                );
            });
            messageRecord.content = cleanedContent;
            
            binaries.push(...extractedBinaries);
        }
    });

    return { data, binaries };
}

/**
 * Extract base64 encoded binary assets from text content
 */
function extractBinariesFromContent(content: string, ticketUid: string): BinaryAsset[] {
    const binaries: BinaryAsset[] = [];

    BASE64_IMAGE_PATTERNS.forEach((pattern) => {
        let match;
        const regex = new RegExp(pattern);
        
        while ((match = regex.exec(content)) !== null) {
            try {
                let base64Data: string;
                let imageType: string;
                
                // Different patterns have different capture groups
                if (match[1] && match[2]) {
                    // Pattern with explicit type and data
                    imageType = match[1];
                    base64Data = match[2];
                } else if (match[1]) {
                    // Pattern with just data
                    imageType = "png"; // default
                    base64Data = match[1];
                } else {
                    continue;
                }

                // Decode base64 to buffer
                const buffer = Buffer.from(base64Data, "base64");
                
                // Skip if the buffer is too small (likely not a real image)
                if (buffer.length < 100) {
                    continue;
                }

                // Generate a unique identifier
                const hash = crypto.createHash("md5").update(buffer).digest("hex");
                const identifier = `${ticketUid}_${hash}`;
                
                binaries.push({
                    identifier,
                    buffer,
                    type: `image/${imageType}`,
                    sourceTicketUid: ticketUid,
                    fileName: `${identifier}.${imageType}`,
                });
            } catch (error) {
                console.warn(`Failed to extract binary from content: ${error}`);
            }
        }
    });

    return binaries;
}

/**
 * Extract text content from a ticket for embedding
 */
export function extractTextContent(data: TicketPackage): string {
    const parts: string[] = [];

    // Extract ticket information
    const ticketRecord = data.records.find((r) => r._context === "ticket");
    if (ticketRecord && "subject" in ticketRecord) {
        parts.push(`Subject: ${ticketRecord.subject}`);
        parts.push(`Ticket: ${ticketRecord.mask}`);
    }

    // Extract message content
    data.records.forEach((record) => {
        if (record._context === "message") {
            const messageRecord = record as MessageRecord;
            const direction = messageRecord.is_outgoing ? "Outgoing" : "Incoming";
            parts.push(`\n${direction} Message:`);
            parts.push(messageRecord.content);
        }
    });

    return parts.join("\n");
}

/**
 * Placeholder: Extract and prepare images for future embedding
 */
export async function prepareImageForEmbedding(binary: BinaryAsset): Promise<any> {
    // TODO: Implement image preprocessing for embedding
    // This could include:
    // - Resizing images
    // - Converting to specific format
    // - Extracting features
    // - Preparing for vision API calls
    console.log(`Image embedding preparation not yet implemented for ${binary.identifier}`);
    return null;
}
