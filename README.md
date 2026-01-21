# DeepRead - Document Intelligence Platform

An AI-powered document intelligence platform combining the best of NotebookLM, Notion, and Adobe Acrobat.

![DeepRead](https://img.shields.io/badge/DeepRead-2.0-purple)

## Features

### 📄 Multi-Document Workspace
- Upload and manage multiple PDFs
- Knowledge base with document indexing
- Collections and organization

### 🤖 AI-Powered Intelligence
- **Smart Q&A**: Ask questions about your documents with source citations
- **Document Summaries**: AI-generated summaries and key topics
- **Explain Selection**: Select text and get instant AI explanations
- Supports OpenAI, Anthropic Claude, and Google Gemini

### 📝 Block-Based Editor
- Notion-style editor with slash commands (`/` to insert blocks)
- Headings, lists, quotes, code blocks, and more
- Rich text formatting with keyboard shortcuts
- Export to Markdown, Word, or PDF

### 🎨 Modern Design
- Beautiful glassmorphism UI with animated backgrounds
- Dark mode by default
- Responsive design for all screen sizes
- Smooth animations and transitions

### 📌 Smart Highlights
- Highlight text in 5 colors
- Highlights panel with quick navigation
- Add selections directly to notes

## Quick Start

### Prerequisites
- Node.js 16+
- API key for at least one AI provider (Gemini recommended)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Keys:**
   
   Edit `.env` file:
   ```env
   GEMINI_API_KEY=your-gemini-key-here
   OPENAI_API_KEY=sk-your-key-here
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   Navigate to `http://localhost:3000`

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `Cmd/Ctrl + K` |
| Next Page | `→` |
| Previous Page | `←` |
| Zoom In | `Ctrl + +` |
| Zoom Out | `Ctrl + -` |
| Bold | `Ctrl + B` |
| Italic | `Ctrl + I` |
| Underline | `Ctrl + U` |

## Tech Stack

- **Frontend**: Vanilla JavaScript, PDF.js, Marked.js
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Storage**: LocalStorage for notes and highlights
- **Design**: Custom CSS with glassmorphism effects

## License

MIT
