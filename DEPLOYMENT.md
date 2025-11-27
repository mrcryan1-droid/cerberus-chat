# Deployment Checklist

## Pre-Installation

- [ ] Node.js 18.0.0 or higher installed
- [ ] npm available
- [ ] Git repository cloned
- [ ] OpenAI API key obtained

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

**Expected:** All packages installed without errors

### 2. Environment Configuration
```bash
cp .env.example .env
nano .env  # or your preferred editor
```

**Required:** Set `OPENAI_API_KEY`

**Optional:** Adjust other parameters as needed

### 3. Build Project
```bash
npm run build
```

**Expected:** 
- `dist/` directory created
- No TypeScript errors
- All .js files generated

### 4. Verify Installation
```bash
npm start stats
```

**Expected:** Statistics output (even if collection is empty)

## Initial Testing

### Test with Sample Data

#### Step 1: Embed Sample
```bash
npm start embed .
```

**Expected:**
- Processes `sample-ticket.json`
- Creates `chromadb/` directory
- Creates `data/` directory
- Shows token usage
- No errors

#### Step 2: Verify Embedding
```bash
npm start stats
```

**Expected:**
- Shows collection with ~3-5 embeddings
- ChromaDB path displayed
- SQLite path displayed

#### Step 3: Test Chat
```bash
npm start chat
```

**Expected:**
- Shows connection message
- Displays prompt
- Try query: "What was the login problem?"
- Should get relevant answer
- Type `exit` to quit

## Production Deployment

### With Real Data

#### Step 1: Organize Tickets
```bash
mkdir -p data/tickets
# Copy your ticket JSON files to data/tickets/
```

#### Step 2: Embed Tickets
```bash
npm start embed data/tickets
```

**Monitor:**
- Progress updates every 10 files
- Token usage
- Error messages (if any)
- Final statistics

#### Step 3: Verify Collection
```bash
npm start stats
```

**Check:**
- Embedding count matches expectations
- Collection name correct
- Paths correct

#### Step 4: Test Queries
```bash
npm start chat
```

**Test with:**
- Common support questions
- Ticket-specific queries
- General queries
- Check source citations

## Troubleshooting

### Build Errors

**Issue:** TypeScript compilation errors
**Solution:**
```bash
npm run clean
npm install
npm run build
```

### Runtime Errors

**Issue:** "Cannot find module"
**Solution:** Check that imports have .js extensions

**Issue:** "OPENAI_API_KEY not set"
**Solution:** Verify .env file exists and has correct key

**Issue:** "No embeddings found"
**Solution:** Run embed command first

### Performance Issues

**Issue:** Slow embedding
**Solution:**
- Process smaller batches
- Use faster embedding model
- Increase batch sizes in code

**Issue:** High token usage
**Solution:**
- Reduce `SEMANTIC_TOP_K`
- Reduce `RERANK_TOP_K`
- Reduce `CHUNK_SIZE`

## Verification Tests

### Test 1: Basic Embedding
```bash
# Should process and embed without errors
npm start embed . --json
```

### Test 2: Query Processing
```bash
# Should return relevant answer with sources
echo "What login issues were reported?" | npm start chat --json
```

### Test 3: Statistics
```bash
# Should show collection info
npm start stats --json
```

## Configuration Checklist

### Required Settings
- [x] `OPENAI_API_KEY` - Set in .env

### Recommended Settings to Review
- [ ] `CHUNK_SIZE` - Adjust based on ticket length
- [ ] `SEMANTIC_TOP_K` - Adjust for context size
- [ ] `RERANK_TOP_K` - Adjust for final results
- [ ] `OPENAI_CHAT_MODEL` - Choose based on budget/quality

### Storage Settings to Review
- [ ] `CHROMA_PATH` - Ensure directory is writable
- [ ] `SQLITE_PATH` - Ensure directory is writable
- [ ] `BINARY_ASSETS_PATH` - Ensure directory is writable

## Maintenance

### Regular Tasks

#### Monitor Token Usage
```bash
# After chat sessions, check usage
npm start stats
```

#### Backup Databases
```bash
# Backup ChromaDB and SQLite
tar -czf backup-$(date +%Y%m%d).tar.gz chromadb/ data/
```

#### Clear and Rebuild
```bash
# If needed to start fresh
rm -rf chromadb/ data/
npm start embed data/tickets
```

## Production Environment

### Recommended Setup

1. **Separate directories for data**
   ```
   /var/lib/cerberus-chat/chromadb
   /var/lib/cerberus-chat/sqlite
   /var/lib/cerberus-chat/assets
   ```

2. **Environment variables**
   ```bash
   export CHROMA_PATH=/var/lib/cerberus-chat/chromadb
   export SQLITE_PATH=/var/lib/cerberus-chat/sqlite/metadata.db
   export BINARY_ASSETS_PATH=/var/lib/cerberus-chat/assets
   ```

3. **Log rotation**
   ```bash
   npm start chat > logs/chat-$(date +%Y%m%d).log 2>&1
   ```

4. **Monitoring**
   - Track token usage
   - Monitor disk space
   - Check error logs

## Success Criteria

✅ All dependencies installed
✅ Project builds without errors
✅ Environment configured
✅ Sample data embedded successfully
✅ Chat interface responds correctly
✅ Stats command shows correct data
✅ Real ticket data processed
✅ Queries return relevant results
✅ Sources cited correctly
✅ Token tracking working

## Next Steps

1. Train team on chat interface
2. Document common queries
3. Set up monitoring
4. Plan for scaling (if needed)
5. Regular backups scheduled
6. Token budget monitoring
7. Performance optimization
8. Custom prompt tuning

## Support Resources

- README.md - Full documentation
- QUICKSTART.md - Getting started guide
- IMPLEMENTATION.md - Technical details
- .env.example - Configuration reference
- sample-ticket.json - Example data format

## Emergency Procedures

### Reset Everything
```bash
npm run clean
rm -rf chromadb/ data/ node_modules/
npm install
npm run build
npm start embed data/tickets
```

### Clear Collection Only
```bash
rm -rf chromadb/
npm start embed data/tickets
```

### Reset Conversation
In chat mode, type: `reset`

## Contact

For issues or questions:
1. Check README.md troubleshooting section
2. Review error logs
3. Verify environment configuration
4. Check OpenAI API status
5. Review token usage and limits
