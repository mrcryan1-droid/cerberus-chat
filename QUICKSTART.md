# Quick Start Guide

## Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-...
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Testing with Sample Data

A sample ticket is included to help you get started quickly.

### 1. Embed the Sample Ticket

```bash
npm start embed . -- --json
```

This will:
- Process `sample-ticket.json`
- Create embeddings
- Store in `./chromadb/`
- Save metadata to `./data/metadata.db`

Expected output:
```json
{
  "success": true,
  "totalTokens": 500,
  "collectionName": "tickets"
}
```

### 2. Start Chat Interface

```bash
npm start chat
```

You'll see:
```
=== Cerberus Chat ===
Connected to collection with 3 embeddings
Type your questions or 'exit' to quit

You: 
```

### 3. Try Sample Queries

Try these example queries:

```
You: What was John's login problem?
```

```
You: How was the login issue resolved?
```

```
You: What troubleshooting steps did John try?
```

### 4. View Statistics

```bash
npm start stats
```

## Working with Real Data

### Directory Structure

Organize your ticket JSON files in a directory:
```
tickets/
  ├── 2024-01/
  │   ├── ticket_001.json
  │   ├── ticket_002.json
  │   └── ...
  ├── 2024-02/
  │   └── ...
  └── ...
```

### Embed All Tickets

```bash
npm start embed ./tickets
```

The system will:
- Recursively scan all subdirectories
- Process each JSON file
- Extract binary assets (images)
- Generate embeddings
- Show progress every 10 files

### Monitor Progress

During embedding, you'll see:
```
Starting embedding process for directory: ./tickets
Found 150 ticket files
Processing: ticket_001.json
Progress: 10/150 files processed
  - Chunks embedded: 45
  - Binaries extracted: 3
  - Tokens used: 12500
...
```

## Configuration Tips

### Adjust Chunk Size

For shorter tickets, reduce chunk size:
```env
CHUNK_SIZE=300
CHUNK_OVERLAP=75
```

### Increase Retrieval Quality

Get more context per query:
```env
SEMANTIC_TOP_K=30
RERANK_TOP_K=10
```

### Use Different Models

For faster embedding (lower cost):
```env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

For better answers:
```env
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
```

## Chat Commands

While in chat mode:

- **exit** or **quit**: Close the chat
- **reset**: Clear conversation history
- **stats**: Show session statistics

## Troubleshooting

### "No embeddings found"

You need to run the embed command first:
```bash
npm start embed ./path/to/tickets
```

### "OPENAI_API_KEY not set"

Make sure your `.env` file exists and contains your API key.

### Large token usage

Reduce the number of results or chunk size:
```env
SEMANTIC_TOP_K=10
RERANK_TOP_K=3
CHUNK_SIZE=300
```

### Slow embedding

Process in smaller batches or use a faster embedding model.

## Development Mode

For development with auto-reload:

```bash
npm run dev embed ./tickets
npm run dev chat
```

## Next Steps

1. Customize prompts in `.env` for your use case
2. Add more tickets to expand the knowledge base
3. Experiment with different retrieval parameters
4. Use the `--json` flag for programmatic access

## Need Help?

Check the main README.md for:
- Detailed architecture explanation
- Complete configuration reference
- API documentation
- Advanced features
