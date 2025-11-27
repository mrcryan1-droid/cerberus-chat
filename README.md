# Cerberus Chat

A comprehensive RAG (Retrieval-Augmented Generation) system for analyzing support ticket email threads using ChromaDB for vector storage, SQLite for metadata, and OpenAI for embeddings and chat.

## Features

- **Vector Database**: ChromaDB with local persistence - no need to re-embed on each startup
- **Metadata Storage**: SQLite for ticket and message metadata
- **Binary Extraction**: Automatically detects and extracts base64-encoded images from ticket content
- **Cost Tracking**: Comprehensive token counting for all OpenAI API calls
- **Two-Phase Search**: Combines keyword/metadata matching with semantic search
- **Reranking**: OpenAI-powered result reranking for improved relevance
- **Text Chunking**: Word-based chunking (500 words, 128 word overlap)
- **Interactive Chat**: CLI-based chat interface with conversation history
- **Strong Typing**: Full TypeScript implementation with comprehensive schemas

## Installation

1. Clone the repository and navigate to the directory:
```bash
cd cerberus-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

5. Build the project:
```bash
npm run build
```

## Usage

### Embedding Tickets

Process ticket JSON files from a directory and create embeddings:

```bash
npm start embed /path/to/tickets
```

Options:
- `-c, --collection <name>`: Specify collection name (default: "tickets")
- `--json`: Output results in JSON format

Example:
```bash
npm start embed ./data/tickets -c support_tickets
```

The embed command will:
1. Recursively scan the directory for JSON files
2. Extract ticket and message data
3. Detect and extract base64-encoded images
4. Save images to the binary assets directory
5. Chunk text content (500 words with 128 word overlap)
6. Generate embeddings using OpenAI
7. Store embeddings in ChromaDB with persistence
8. Save metadata to SQLite

### Chat Interface

Start an interactive chat session:

```bash
npm start chat
```

Options:
- `-c, --collection <name>`: Specify collection name (default: "tickets")
- `--json`: Output results in JSON format

Special commands in chat:
- `exit` or `quit`: Exit the chat
- `reset`: Clear conversation history
- `stats`: Show session statistics

The chat system:
1. Takes your natural language query
2. Generates query embedding
3. Performs hybrid search (keyword + semantic)
4. Reranks results using OpenAI
5. Builds context from top results
6. Generates answer using GPT-4
7. Displays sources with ticket references

### Database Statistics

View database statistics:

```bash
npm start stats
```

## Configuration

All configuration is managed through environment variables in the `.env` file:

### OpenAI Settings
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OPENAI_EMBEDDING_MODEL`: Model for embeddings (default: text-embedding-3-small)
- `OPENAI_CHAT_MODEL`: Model for chat completions (default: gpt-4)
- `OPENAI_RERANK_MODEL`: Model for reranking (default: gpt-4)
- `OPENAI_TEMPERATURE`: Temperature for chat (default: 0.7)
- `OPENAI_MAX_TOKENS`: Max tokens for responses (default: 2000)

### Chunking Settings
- `CHUNK_SIZE`: Words per chunk (default: 500)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 128)
- `MIN_CHUNK_SIZE`: Minimum chunk size (default: 50)

### Retrieval Settings
- `SEMANTIC_TOP_K`: Results from semantic search (default: 20)
- `KEYWORD_TOP_K`: Results from keyword search (default: 10)
- `RERANK_TOP_K`: Final results after reranking (default: 5)
- `MIN_SIMILARITY_SCORE`: Minimum similarity threshold (default: 0.5)

### Storage Settings
- `CHROMA_PATH`: ChromaDB storage path (default: ./chromadb)
- `SQLITE_PATH`: SQLite database path (default: ./data/metadata.db)
- `BINARY_ASSETS_PATH`: Extracted binaries path (default: ./data/assets)
- `COLLECTION_NAME`: Default collection name (default: tickets)

### Custom Prompts
- `SYSTEM_PROMPT`: Custom system prompt for chat
- `RERANK_PROMPT`: Custom prompt for reranking
- `ANSWER_PROMPT`: Custom prompt for generating answers

## Ticket Data Format

Input files should be JSON with the following structure:

```json
{
    "package": {
        "name": "Ticket #113395",
        "revision": 1,
        "requires": {
            "cerb_version": "10.4.0",
            "plugins": []
        },
        "configure": {
            "prompts": [],
            "placeholders": [],
            "options": {
                "disable_events": true
            }
        }
    },
    "records": [
        {
            "uid": "ticket_113395",
            "_context": "ticket",
            "mask": "SUPPGU-62595-487",
            "subject": "Initial Login Information",
            "importance": 50,
            "group_id": 6,
            "bucket_id": 15
        },
        {
            "uid": "message_191848",
            "_context": "message",
            "ticket_id": "{{{uid.ticket_113395}}}",
            "is_outgoing": 0,
            "response_time": 0,
            "hash_header_message_id": "8bc8f74a801b805ae0fb8b22df6d8878a7644ddc",
            "content": "Message content here..."
        }
    ]
}
```

## Architecture

### Components

- **config.ts**: Centralized configuration with strong typing
- **schema.ts**: TypeScript interfaces for all data structures
- **openai.ts**: OpenAI API integration with token tracking
- **cost-tracker.ts**: Token usage tracking
- **db/chroma.ts**: ChromaDB vector database client
- **db/sqlite.ts**: SQLite metadata storage
- **ingest/extractor.ts**: Binary extraction and content parsing
- **ingest/chunker.ts**: Text chunking with overlap
- **rag/selector.ts**: Two-phase retrieval (keyword + semantic)
- **rag/reranker.ts**: OpenAI-powered reranking
- **commands/embed.ts**: Embedding pipeline
- **commands/chat.ts**: Interactive chat interface

### RAG Pipeline

1. **Ingestion**:
   - Parse ticket JSON files
   - Extract base64 images → save to disk
   - Chunk text with overlap
   - Generate embeddings
   - Store in ChromaDB + SQLite

2. **Retrieval**:
   - Generate query embedding
   - Keyword search in ChromaDB
   - Semantic search with embeddings
   - Combine and deduplicate results

3. **Reranking**:
   - Score results with OpenAI
   - Apply diversity filtering
   - Return top K results

4. **Generation**:
   - Build context from top chunks
   - Generate answer with GPT-4
   - Track token usage
   - Return answer with sources

## Future Enhancements

- Image embedding support (placeholder functions included)
- Advanced metadata filtering
- Multi-modal search combining text and images
- Custom reranking strategies
- Batch processing improvements
- Web interface

## Development

Run in development mode:
```bash
npm run dev embed ./data/tickets
npm run dev chat
```

Clean build files:
```bash
npm run clean
```

## License

MIT
