const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// AI API Proxy Endpoints
app.post('/api/ai/openai', async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Use GPT-4o for best vision/text performance
                messages: messages,
                max_tokens: 1000
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/anthropic', async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: messages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Anthropic Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/gemini', async (req, res) => {
    try {
        const { prompt, image } = req.body;

        // Clean base64 image if needed (remove data:image/png;base64, prefix)
        let cleanImage = image;
        if (image && image.includes('base64,')) {
            cleanImage = image.split('base64,')[1];
        }

        const requestBody = {
            contents: [{
                parts: cleanImage
                    ? [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: cleanImage } }]
                    : [{ text: prompt }]
            }]
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Gemini Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// In-memory RAG Store
const documents = new Map(); // docId -> { filename, chunks: [] }

// Helper: Chunk text
function chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start += chunkSize - overlap;
    }
    return chunks;
}

// Helper: Simple keyword search (TF-IDF style simplified)
function searchDocuments(query) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const results = [];

    for (const [docId, doc] of documents) {
        doc.chunks.forEach((chunk, index) => {
            let score = 0;
            const chunkLower = chunk.toLowerCase();
            queryTerms.forEach(term => {
                if (chunkLower.includes(term)) score += 1;
            });

            if (score > 0) {
                results.push({
                    docId,
                    filename: doc.filename,
                    text: chunk,
                    score
                });
            }
        });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// RAG Endpoints
app.post('/api/rag/index', (req, res) => {
    try {
        const { docId, filename, text } = req.body;
        const chunks = chunkText(text);
        documents.set(docId, { filename, chunks });
        console.log(`Indexed document: ${filename} (${chunks.length} chunks)`);
        res.json({ status: 'success', chunks: chunks.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rag/query', (req, res) => {
    try {
        const { query } = req.body;
        const results = searchDocuments(query);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rag/clear', (req, res) => {
    documents.clear();
    res.json({ status: 'cleared' });
});

// Web Search Endpoint
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_CX;

        if (!apiKey || !cx) {
            // Mock response if keys missing
            return res.json({
                results: [
                    {
                        title: "Mock Search Result 1",
                        link: "http://example.com",
                        snippet: "This is a mock search result because API keys are not configured."
                    },
                    {
                        title: "Mock Search Result 2",
                        link: "http://example.com",
                        snippet: "Configure GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in .env to enable real search."
                    }
                ]
            });
        }

        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Search failed');
        }

        const results = (data.items || []).map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }));

        res.json({ results });
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 PDF Reader Pro server running on http://localhost:${PORT}`);
    console.log(`📝 API Keys loaded: ${process.env.OPENAI_API_KEY ? '✓' : '✗'} OpenAI, ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗'} Anthropic, ${process.env.GEMINI_API_KEY ? '✓' : '✗'} Gemini`);
    console.log(`🔍 Search Keys: ${process.env.GOOGLE_SEARCH_API_KEY ? '✓' : '✗'} Google`);
});
