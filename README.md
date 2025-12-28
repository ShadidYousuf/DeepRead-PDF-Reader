# PDF Reader Pro

A professional-grade PDF reader with AI integration, note-taking, and advanced features.

## Features

- 📄 **PDF Viewing** - Smooth rendering with zoom and navigation
- 🎨 **Text Highlighting** - 5 colors with persistent storage
- 📝 **Rich Note Editor** - Font controls, colors, formatting
- 🤖 **AI Integration** - OpenAI, Anthropic, and Gemini support
- 🔍 **Search** - Find text across all pages
- 💾 **Export** - Markdown, Word, and PDF formats
- 🖼️ **Image Support** - Insert images in notes
- ⌨️ **Keyboard Shortcuts** - Fast navigation and editing
- 🌙 **Dark Mode** - Modern glassmorphism design

## Setup

### Prerequisites

- Node.js 16+ and npm
- A modern web browser

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Keys:**
   
   Edit `.env` file and add your API keys:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   GEMINI_API_KEY=your-gemini-key-here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Usage

### Opening PDFs
- Click "Open PDF" button
- Or drag and drop PDF files anywhere

### Taking Notes
- Use the rich text editor with formatting controls
- Change font size and color
- Insert images
- Generate content with AI
- Export to Markdown, Word, or PDF

### AI Features
- Select text and click "Explain" for AI insights
- Use "Generate with AI" in notes toolbar
- Upload images for AI analysis (coming soon)

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Next Page | `→` |
| Previous Page | `←` |
| Zoom In | `Ctrl` + `+` |
| Zoom Out | `Ctrl` + `-` |
| Bold | `Ctrl` + `B` |
| Italic | `Ctrl` + `I` |
| Underline | `Ctrl` + `U` |
| Fullscreen | `F11` |

## Security

API keys are stored server-side in `.env` file and never exposed to the browser. All AI requests are proxied through the backend server.

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Production
npm start
```

## Tech Stack

- **Frontend**: Vanilla JavaScript, PDF.js
- **Backend**: Node.js, Express
- **AI APIs**: OpenAI, Anthropic, Google Gemini
- **Storage**: LocalStorage for notes and highlights

## License

MIT
