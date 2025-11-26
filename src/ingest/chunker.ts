export function chunkText(text: string, chunkSize = 500, overlap = 128): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let start = 0; start < words.length; start += (chunkSize - overlap)) {
        chunks.push(words.slice(start, start + chunkSize).join(" "));
        if (start + chunkSize >= words.length) break;
    }
    return chunks;
}
