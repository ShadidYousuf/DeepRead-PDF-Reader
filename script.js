/**
 * PDF Reader Pro - Main Application Script
 */

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
const state = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    highlights: [],
    selectedColor: '#ffeb3b',
    selectedText: '',
    apiKey: '',
    aiModel: 'openai',
    recentFiles: [],
    searchResults: [],
    currentSearchIndex: 0,
    renderedPages: new Set(),
    pageObserver: null,
    documents: new Map(), // docId -> { name, pageCount }
    aiImage: null // To store selected image for AI
};

// DOM Elements
const elements = {
    openPdfBtn: document.getElementById('openPdfBtn'),
    pdfInput: document.getElementById('pdfInput'),
    pdfCanvas: document.getElementById('pdfCanvas'),
    pdfContainer: document.getElementById('pdfContainer'),
    textLayer: document.getElementById('textLayer'),
    highlightLayer: document.getElementById('highlightLayer'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    zoomLevel: document.getElementById('zoomLevel'),
    toggleNotes: document.getElementById('toggleNotes'),
    // AI Widget
    aiWidgetToggle: document.getElementById('aiWidgetToggle'),
    aiPanel: document.getElementById('aiPanel'),
    aiWidgetToggle: document.getElementById('aiWidgetToggle'),
    aiPanel: document.getElementById('aiPanel'),
    closeAIBtn: document.getElementById('closeAIBtn'),
    aiImageBtn: document.getElementById('aiImageBtn'),
    aiImageInput: document.getElementById('aiImageInput'),

    // Notes Panel
    notesPanel: document.getElementById('notesPanel'),
    closeNotesBtn: document.getElementById('closeNotesBtn'),
    notesEditor: document.getElementById('notesEditor'),
    headingSelect: document.getElementById('headingSelect'),
    clearNotes: document.getElementById('clearNotes'),
    highlightsList: document.getElementById('highlightsList'),
    highlightCount: document.getElementById('highlightCount'),
    highlightsToggle: document.getElementById('highlightsToggle'),
    aiSettings: document.getElementById('aiSettings'),
    aiConfig: document.getElementById('aiConfig'),
    aiModel: document.getElementById('aiModel'),
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    saveApiKey: document.getElementById('saveApiKey'),
    chatContainer: document.getElementById('chatContainer'),
    chatInput: document.getElementById('chatInput'),
    sendMessage: document.getElementById('sendMessage'),
    explainBtn: document.getElementById('explainBtn'),
    selectionPopup: document.getElementById('selectionPopup'),
    exportNotes: document.getElementById('exportNotes'),
    saveStatus: document.getElementById('saveStatus'),
    highlightSelection: document.getElementById('highlightSelection'),
    explainSelection: document.getElementById('explainSelection'),
    copySelection: document.getElementById('copySelection'),
    pdfFilename: document.getElementById('pdfFilename'),
    toast: document.getElementById('toast'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    recentFilesBtn: document.getElementById('recentFilesBtn'),
    recentFilesMenu: document.getElementById('recentFilesMenu'),
    recentFilesList: document.getElementById('recentFilesList'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    fontSizeSelect: document.getElementById('fontSizeSelect'),
    textColorPicker: document.getElementById('textColorPicker'),
    generateWithAI: document.getElementById('generateWithAI'),
    insertImageBtn: document.getElementById('insertImageBtn'),
    noteImageInput: document.getElementById('noteImageInput'),
    exportNotesBtn: document.getElementById('exportNotesBtn'),
    exportMenu: document.getElementById('exportMenu')
};

// Initialize Application
function init() {
    loadSavedData();
    setupEventListeners();
    setupFormatButtons();
    setupDragAndDrop();
    setupKeyboardShortcuts();
}

// Load saved data from localStorage
function loadSavedData() {
    const savedNotes = localStorage.getItem('pdfReaderNotes');
    if (savedNotes) {
        elements.notesEditor.innerHTML = savedNotes;
    }

    const savedHighlights = localStorage.getItem('pdfReaderHighlights');
    if (savedHighlights) {
        state.highlights = JSON.parse(savedHighlights);
    }

    const savedApiKey = localStorage.getItem('pdfReaderApiKey');
    if (savedApiKey) {
        state.apiKey = savedApiKey;
        elements.apiKey.value = savedApiKey;
    }

    const savedModel = localStorage.getItem('pdfReaderModel');
    if (savedModel) {
        state.aiModel = savedModel;
        elements.aiModel.value = savedModel;
    }

    const savedRecentFiles = localStorage.getItem('pdfReaderRecentFiles');
    if (savedRecentFiles) {
        state.recentFiles = JSON.parse(savedRecentFiles);
        updateRecentFilesList();
    }
}

// Save data to localStorage
function saveNotes() {
    localStorage.setItem('pdfReaderNotes', elements.notesEditor.innerHTML);
    showSaveStatus();
}

function showSaveStatus() {
    elements.saveStatus.classList.add('visible');
    setTimeout(() => {
        elements.saveStatus.classList.remove('visible');
    }, 2000);
}

function saveHighlights() {
    localStorage.setItem('pdfReaderHighlights', JSON.stringify(state.highlights));
    updateHighlightsList();
}

// Setup Event Listeners
function setupEventListeners() {
    // PDF Controls
    elements.openPdfBtn.addEventListener('click', () => elements.pdfInput.click());
    elements.pdfInput.addEventListener('change', handleFileSelect);
    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));
    elements.currentPage.addEventListener('change', handlePageInput);
    elements.zoomIn.addEventListener('click', () => changeZoom(0.25));
    elements.zoomOut.addEventListener('click', () => changeZoom(-0.25));

    // Panel Toggles
    elements.toggleNotes.addEventListener('click', () => togglePanel('notes'));
    elements.aiWidgetToggle.addEventListener('click', () => togglePanel('ai'));
    elements.closeAIBtn.addEventListener('click', () => togglePanel('ai'));
    elements.closeNotesBtn.addEventListener('click', () => togglePanel('notes'));

    // Notes Editor
    elements.notesEditor.addEventListener('input', debounce(saveNotes, 1000));
    elements.headingSelect.addEventListener('change', handleHeadingChange);
    elements.clearNotes.addEventListener('click', clearNotes);

    // Enhanced Editor Controls
    elements.fontSizeSelect.addEventListener('change', handleFontSizeChange);
    elements.textColorPicker.addEventListener('change', handleTextColorChange);
    elements.generateWithAI.addEventListener('click', generateTextWithAI);
    elements.insertImageBtn.addEventListener('click', () => elements.noteImageInput.click());
    elements.noteImageInput.addEventListener('change', handleImageInsert);

    // Formatting Buttons
    document.querySelectorAll('.btn[data-format]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const command = e.currentTarget.dataset.format;
            handleFormat(command);
        });
    });

    // Export Menu
    elements.exportNotesBtn.addEventListener('click', toggleExportMenu);
    document.querySelectorAll('.export-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.target.dataset.format;
            exportNotes(format);
            elements.exportMenu.classList.remove('visible');
        });
    });
    document.addEventListener('click', (e) => {
        if (!elements.exportNotesBtn.contains(e.target) && !elements.exportMenu.contains(e.target)) {
            elements.exportMenu.classList.remove('visible');
        }
    });

    // Highlights
    elements.highlightsToggle.addEventListener('click', toggleHighlightsSection);

    // Color Picker
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => selectColor(btn));
    });

    // AI Panel
    elements.aiSettings.addEventListener('click', toggleAISettings);
    elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
    elements.saveApiKey.addEventListener('click', saveAPISettings);
    elements.saveApiKey.addEventListener('click', saveAPISettings);
    elements.sendMessage.addEventListener('click', sendChatMessage);
    elements.aiImageBtn.addEventListener('click', () => elements.aiImageInput.click());
    elements.aiImageInput.addEventListener('change', handleAIImageSelect);
    elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    elements.explainBtn.addEventListener('click', explainSelectedText);

    // Selection Popup
    elements.highlightSelection.addEventListener('click', highlightSelectedText);
    elements.explainSelection.addEventListener('click', () => {
        hideSelectionPopup();
        explainSelectedText();
    });
    elements.copySelection.addEventListener('click', copySelectedText);

    // Search
    elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchInPDF();
        }
    });
    elements.searchBtn.addEventListener('click', searchInPDF);

    // Fullscreen
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Recent Files
    elements.recentFilesBtn.addEventListener('click', toggleRecentFilesMenu);
    document.addEventListener('click', (e) => {
        if (!elements.recentFilesBtn.contains(e.target) && !elements.recentFilesMenu.contains(e.target)) {
            elements.recentFilesMenu.classList.remove('visible');
        }
    });

    // Text Selection in PDF
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', (e) => {
        if (!elements.selectionPopup.contains(e.target)) {
            hideSelectionPopup();
        }
    });
}

// Drag & Drop Support
function setupDragAndDrop() {
    const dropZone = document.body;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0 && files[0].type === 'application/pdf') {
            elements.pdfInput.files = files;
            handleFileSelect({ target: elements.pdfInput });
        } else {
            showToast('Please drop a valid PDF file', 'error');
        }
    }
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore shortcuts if typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        // Navigation
        if (e.key === 'ArrowLeft') {
            changePage(-1);
        } else if (e.key === 'ArrowRight') {
            changePage(1);
        }

        // Zoom
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                changeZoom(0.25);
            } else if (e.key === '-') {
                e.preventDefault();
                changeZoom(-0.25);
            }
        }
    });

    // Editor Shortcuts (work even when focused)
    elements.notesEditor.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    break;
            }
        }
    });
}

// Export Notes
function exportNotesToMarkdown() {
    const html = elements.notesEditor.innerHTML;
    if (!html.trim()) {
        showToast('No notes to export', 'info');
        return;
    }

    // Simple HTML to Markdown conversion
    let markdown = html
        .replace(/<div>/g, '\n')
        .replace(/<\/div>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<b>/g, '**').replace(/<\/b>/g, '**')
        .replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')
        .replace(/<i>/g, '*').replace(/<\/i>/g, '*')
        .replace(/<em>/g, '*').replace(/<\/em>/g, '*')
        .replace(/<u>/g, '__').replace(/<\/u>/g, '__')
        .replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n\n')
        .replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n\n')
        .replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n\n')
        .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '').replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '- ').replace(/<\/li>/g, '\n')
        .replace(/&nbsp;/g, ' ');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Notes exported to notes.md', 'success');
}

// PDF Handling
async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Show loading overlay
    elements.loadingOverlay.classList.add('visible');

    try {
        let firstFileLoaded = false;

        for (const file of files) {
            if (file.type !== 'application/pdf') continue;

            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Index document for RAG
            await indexDocument(file.name, pdfDoc);

            // Update Knowledge Base UI
            state.documents.set(file.name, { name: file.name, pageCount: pdfDoc.numPages });
            updateKBIndicator();

            // If this is the first file (or the only one being viewed), render it
            if (!state.pdfDoc || files.length === 1) {
                state.pdfDoc = pdfDoc;
                state.totalPages = state.pdfDoc.numPages;
                state.currentPage = 1;

                // Auto fit-to-width
                const container = elements.pdfContainer;
                const containerWidth = container.clientWidth - 48; // padding
                const page = await state.pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1 });
                state.scale = containerWidth / viewport.width;

                elements.totalPages.textContent = state.totalPages;
                elements.pdfFilename.textContent = file.name;
                document.querySelector('.pdf-placeholder').style.display = 'none';

                // Add to recent files
                addToRecentFiles(file.name);

                // Render all pages for scrolling
                await renderAllPages();

                // Setup scroll observer
                setupPageObserver();

                firstFileLoaded = true;
            }
        }

        elements.loadingOverlay.classList.remove('visible');
        showToast(`Added ${files.length} document(s) to Knowledge Base`, 'success');

    } catch (error) {
        console.error('Error loading PDF:', error);
        elements.loadingOverlay.classList.remove('visible');
        showToast('Error loading PDF', 'error');
    }
}

async function indexDocument(filename, pdfDoc) {
    showToast(`Indexing ${filename}...`, 'info');
    let fullText = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    // Send to backend
    await fetch('/api/rag/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            docId: filename, // Simple ID for now
            filename: filename,
            text: fullText
        })
    });
}

function updateKBIndicator() {
    const kbCount = document.getElementById('kbCount');
    if (kbCount) {
        kbCount.textContent = state.documents.size;
    }
}

async function renderAllPages() {
    const container = elements.pdfContainer;

    // Clear existing content
    container.innerHTML = '';
    state.renderedPages.clear();

    // Create page containers
    for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container';
        pageContainer.dataset.pageNumber = pageNum;

        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        canvas.id = `page-${pageNum}`;

        const textLayer = document.createElement('div');
        textLayer.className = 'text-layer';
        textLayer.id = `text-layer-${pageNum}`;

        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'highlight-layer';
        highlightLayer.id = `highlight-layer-${pageNum}`;

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayer);
        pageContainer.appendChild(highlightLayer);

        container.appendChild(pageContainer);

        // Render first few pages immediately
        if (pageNum <= 3) {
            await renderPage(pageNum);
        }
    }
}

async function renderPage(pageNum) {
    if (!state.pdfDoc || state.renderedPages.has(pageNum)) return;

    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    const canvas = document.getElementById(`page-${pageNum}`);
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Render text layer
    const textLayer = document.getElementById(`text-layer-${pageNum}`);
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;

    const textContent = await page.getTextContent();
    textContent.items.forEach(item => {
        const div = document.createElement('span');
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontSize = Math.sqrt((tx[0] * tx[0]) + (tx[1] * tx[1]));

        div.textContent = item.str;
        div.style.position = 'absolute';
        div.style.left = `${tx[4]}px`;
        div.style.top = `${tx[5] - fontSize}px`;
        div.style.fontSize = `${fontSize}px`;
        div.style.fontFamily = item.fontName || 'sans-serif';

        textLayer.appendChild(div);
    });

    // Render highlights for this page
    renderHighlightsForPage(pageNum);

    state.renderedPages.add(pageNum);
}

function renderHighlightsForPage(pageNum) {
    const highlightLayer = document.getElementById(`highlight-layer-${pageNum}`);
    if (!highlightLayer) return;

    highlightLayer.innerHTML = '';

    const pageHighlights = state.highlights.filter(h => h.page === pageNum);

    pageHighlights.forEach(highlight => {
        const mark = document.createElement('div');
        mark.className = 'highlight-mark';
        mark.style.position = 'absolute';
        mark.style.left = `${highlight.rect.x}px`;
        mark.style.top = `${highlight.rect.y}px`;
        mark.style.width = `${highlight.rect.width}px`;
        mark.style.height = `${highlight.rect.height}px`;
        mark.style.backgroundColor = highlight.color;
        mark.title = highlight.text.substring(0, 50) + '...';

        highlightLayer.appendChild(mark);
    });
}

function setupPageObserver() {
    // Disconnect existing observer
    if (state.pageObserver) {
        state.pageObserver.disconnect();
    }

    // Create intersection observer to track visible pages
    state.pageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const pageNum = parseInt(entry.target.dataset.pageNumber);

            if (entry.isIntersecting) {
                // Render page if not already rendered
                if (!state.renderedPages.has(pageNum)) {
                    renderPage(pageNum);
                }

                // Update current page to the most visible one
                if (entry.intersectionRatio > 0.5) {
                    state.currentPage = pageNum;
                    elements.currentPage.value = pageNum;
                }
            }
        });
    }, {
        root: elements.pdfContainer,
        threshold: [0, 0.5, 1]
    });

    // Observe all page containers
    document.querySelectorAll('.pdf-page-container').forEach(container => {
        state.pageObserver.observe(container);
    });
}

function changePage(delta) {
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
        // Scroll to the page
        const pageContainer = document.querySelector(`[data-page-number="${newPage}"]`);
        if (pageContainer) {
            pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function handlePageInput(e) {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= state.totalPages) {
        const pageContainer = document.querySelector(`[data-page-number="${page}"]`);
        if (pageContainer) {
            pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } else {
        e.target.value = state.currentPage;
    }
}

function changeZoom(delta) {
    const newScale = Math.max(0.5, Math.min(3, state.scale + delta));
    state.scale = newScale;
    elements.zoomLevel.textContent = `${Math.round(newScale * 100)}%`;

    if (state.pdfDoc) {
        // Re-render all visible pages with new scale
        state.renderedPages.clear();
        renderAllPages();
    }
}

// Text Selection & Highlighting
function handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && elements.pdfContainer.contains(selection.anchorNode)) {
        state.selectedText = text;
        showSelectionPopup(e);
    }
}

function showSelectionPopup(e) {
    const popup = elements.selectionPopup;
    popup.style.left = `${e.pageX - 50}px`;
    popup.style.top = `${e.pageY - 50}px`;
    popup.classList.add('visible');
}

function hideSelectionPopup() {
    elements.selectionPopup.classList.remove('visible');
}

function highlightSelectedText() {
    if (!state.selectedText) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = elements.pdfContainer.getBoundingClientRect();

    const highlight = {
        id: Date.now(),
        page: state.currentPage,
        text: state.selectedText,
        color: state.selectedColor.replace(')', ', 0.4)').replace('rgb', 'rgba').replace('#', ''),
        rect: {
            x: rect.left - containerRect.left + elements.pdfContainer.scrollLeft,
            y: rect.top - containerRect.top + elements.pdfContainer.scrollTop,
            width: rect.width,
            height: rect.height
        }
    };

    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    highlight.color = hexToRgba(state.selectedColor, 0.4);

    state.highlights.push(highlight);
    saveHighlights();
    renderHighlights();

    selection.removeAllRanges();
    hideSelectionPopup();
    showToast('Text highlighted', 'success');
}

function selectColor(btn) {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedColor = btn.dataset.color;
}

function updateHighlightsList() {
    const list = elements.highlightsList;
    elements.highlightCount.textContent = state.highlights.length;

    if (state.highlights.length === 0) {
        list.innerHTML = '<p class="empty-state">No highlights yet. Select text in the PDF to highlight.</p>';
        return;
    }

    list.innerHTML = state.highlights.map(h => `
        <div class="highlight-item" data-id="${h.id}" data-page="${h.page}">
            <div class="highlight-color-dot" style="background: ${h.color}"></div>
            <span class="highlight-text">${h.text}</span>
            <button class="highlight-delete" onclick="deleteHighlight(${h.id})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');

    // Add click handlers to navigate to highlight page
    list.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.highlight-delete')) {
                const page = parseInt(item.dataset.page);
                if (page !== state.currentPage) {
                    state.currentPage = page;
                    renderPage(state.currentPage);
                }
            }
        });
    });
}

window.deleteHighlight = function (id) {
    state.highlights = state.highlights.filter(h => h.id !== id);
    saveHighlights();
    renderHighlights();
    showToast('Highlight removed', 'success');
};

function toggleHighlightsSection() {
    const toggle = elements.highlightsToggle;
    const list = elements.highlightsList;
    toggle.classList.toggle('collapsed');
    list.classList.toggle('collapsed');
}

function copySelectedText() {
    if (state.selectedText) {
        navigator.clipboard.writeText(state.selectedText);
        hideSelectionPopup();
        showToast('Text copied to clipboard', 'success');
    }
}

// Panel Management
function togglePanel(panelName) {
    if (panelName === 'notes') {
        elements.notesPanel.classList.toggle('hidden');
    } else if (panelName === 'ai') {
        elements.aiPanel.classList.toggle('hidden');
    }
}

// Notes Editor
function setupFormatButtons() {
    document.querySelectorAll('.format-btn').forEach(btn => {
        const command = btn.dataset.command;
        if (command) {
            btn.addEventListener('click', () => {
                document.execCommand(command, false, null);
                elements.notesEditor.focus();
            });
        }
    });
}

function handleHeadingChange(e) {
    const tag = e.target.value;
    document.execCommand('formatBlock', false, tag);
    elements.notesEditor.focus();
}

function handleFormat(command) {
    document.execCommand(command, false, null);
    elements.notesEditor.focus();
}

function clearNotes() {
    if (confirm('Are you sure you want to clear all notes?')) {
        elements.notesEditor.innerHTML = '';
        saveNotes();
        showToast('Notes cleared', 'success');
    }
}

// Enhanced Editor Functions
function handleFontSizeChange(e) {
    const fontSize = e.target.value;
    document.execCommand('fontSize', false, '7'); // Use a dummy size
    const fontElements = elements.notesEditor.querySelectorAll('font[size="7"]');
    fontElements.forEach(el => {
        el.removeAttribute('size');
        el.style.fontSize = fontSize;
    });
    elements.notesEditor.focus();
}

function handleTextColorChange(e) {
    const color = e.target.value;
    document.execCommand('foreColor', false, color);
    elements.notesEditor.focus();
}

async function generateTextWithAI() {
    const prompt = window.prompt('What would you like AI to generate?');
    if (!prompt) return;

    showToast('Generating with AI...', 'info');

    try {
        const response = await callBackendAI(prompt, state.aiModel);

        // Insert AI response at cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(response);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            elements.notesEditor.innerHTML += `<p>${response}</p>`;
        }

        saveNotes();
        showToast('Text generated successfully', 'success');
    } catch (error) {
        console.error('AI Generation Error:', error);
        showToast('Failed to generate text', 'error');
    }
}

function handleImageInsert(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.margin = '10px 0';

        // Insert at cursor or end
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(img);
        } else {
            elements.notesEditor.appendChild(img);
        }

        saveNotes();
        showToast('Image inserted', 'success');
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
}

function toggleExportMenu() {
    elements.exportMenu.classList.toggle('visible');
}

async function exportNotes(format) {
    const html = elements.notesEditor.innerHTML;
    if (!html.trim()) {
        showToast('No notes to export', 'info');
        return;
    }

    switch (format) {
        case 'md':
            exportToMarkdown(html);
            break;
        case 'docx':
            await exportToDocx(html);
            break;
        case 'pdf':
            await exportToPDF(html);
            break;
    }
}

function exportToMarkdown(html) {
    // Simple HTML to Markdown conversion
    let markdown = html
        .replace(/<div>/g, '\n')
        .replace(/<\/div>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<b>/g, '**').replace(/<\/b>/g, '**')
        .replace(/<strong>/g, '**').replace(/<\/strong>/g, '**')
        .replace(/<i>/g, '*').replace(/<\/i>/g, '*')
        .replace(/<em>/g, '*').replace(/<\/em>/g, '*')
        .replace(/<u>/g, '__').replace(/<\/u>/g, '__')
        .replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n\n')
        .replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n\n')
        .replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n\n')
        .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '').replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '- ').replace(/<\/li>/g, '\n')
        .replace(/&nbsp;/g, ' ');

    downloadFile(markdown, 'notes.md', 'text/markdown');
    showToast('Notes exported to Markdown', 'success');
}

async function exportToDocx(html) {
    showToast('Exporting to Word...', 'info');

    try {
        // Convert HTML to simple text for now, or use html-to-docx if available
        // Since we're using docx.js, we need to construct the document
        // For simplicity in this demo, we'll create a document with the text content

        const { Document, Packer, Paragraph, TextRun } = docx;

        // Extract text lines from editor
        const textLines = elements.notesEditor.innerText.split('\n');

        const doc = new Document({
            sections: [{
                properties: {},
                children: textLines.map(line => new Paragraph({
                    children: [new TextRun(line)],
                    spacing: { after: 200 }
                }))
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "notes.docx");
        showToast('Notes exported to Word', 'success');
    } catch (error) {
        console.error('DOCX Export Error:', error);
        showToast('Failed to export to Word', 'error');
    }
}

async function exportToPDF(html) {
    showToast('Exporting to PDF...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Use html2canvas to render the notes editor
        // Note: This captures the visual look
        const canvas = await html2canvas(elements.notesEditor, {
            scale: 2,
            useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        doc.save('notes.pdf');

        showToast('Notes exported to PDF', 'success');
    } catch (error) {
        console.error('PDF Export Error:', error);
        showToast('Failed to export to PDF', 'error');
    }
}

async function handleAIQuery(prompt, image = null) {
    // Switch to AI panel if not visible
    if (elements.aiPanel.classList.contains('hidden')) {
        togglePanel('ai');
    }

    // Add user message
    addChatMessage(prompt, 'user', image);

    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai loading';
    loadingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    elements.chatContainer.appendChild(loadingDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

    try {
        let context = '';
        let searchResults = '';

        // 1. RAG Retrieval (only if text prompt exists)
        if (prompt && state.documents.size > 0) {
            const ragResponse = await fetch('/api/rag/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: prompt })
            });
            const ragData = await ragResponse.json();
            if (ragData.results && ragData.results.length > 0) {
                context = ragData.results.map(r => `[Document: ${r.filename}]\n${r.text}`).join('\n\n');
            }
        }

        // 2. Web Search (if requested and text prompt exists)
        const searchKeywords = ['search', 'google', 'find', 'lookup', 'latest', 'current'];
        const needsSearch = prompt && searchKeywords.some(k => prompt.toLowerCase().includes(k));

        if (needsSearch) {
            loadingDiv.innerHTML = '<div class="typing-indicator"><span>Searching web...</span></div>';
            const searchResponse = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: prompt })
            });
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
                searchResults = searchData.results.map(r => `[Web: ${r.title}](${r.link})\n${r.snippet}`).join('\n\n');
            }
        }

        // 3. Construct Augmented Prompt
        let augmentedPrompt = prompt;
        if (context || searchResults) {
            augmentedPrompt = `Context Information:\n${context}\n\nWeb Search Results:\n${searchResults}\n\nUser Question: ${prompt}\n\nAnswer the question based on the context and search results provided. Cite sources where possible.`;
        }

        const response = await callBackendAI(augmentedPrompt, state.aiModel, image);
        loadingDiv.remove();
        addChatMessage(response, 'ai');
    } catch (error) {
        loadingDiv.remove();
        console.error('AI Error:', error);
        addChatMessage(`Error: ${error.message}`, 'ai');
        showToast('Failed to get AI response', 'error');
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// AI Integration
function toggleAISettings() {
    elements.aiConfig.classList.toggle('visible');
}

function toggleApiKeyVisibility() {
    const input = elements.apiKey;
    input.type = input.type === 'password' ? 'text' : 'password';
}

function saveAPISettings() {
    state.apiKey = elements.apiKey.value;
    state.aiModel = elements.aiModel.value;
    localStorage.setItem('pdfReaderApiKey', state.apiKey);
    localStorage.setItem('pdfReaderModel', state.aiModel);
    elements.aiConfig.classList.remove('visible');
    showToast('Settings saved', 'success');
}

function handleAIImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showToast('Image too large (max 5MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            state.aiImage = e.target.result; // Base64 string
            elements.aiImageBtn.classList.add('active'); // Visual indicator
            showToast('Image attached', 'success');
        };
        reader.readAsDataURL(file);
    }
}

async function sendChatMessage() {
    const prompt = elements.chatInput.value.trim();
    if (!prompt && !state.aiImage) return; // Allow sending just image if supported

    elements.chatInput.value = '';

    // Reset image state after sending
    const image = state.aiImage;
    state.aiImage = null;
    elements.aiImageBtn.classList.remove('active');
    elements.aiImageInput.value = ''; // Reset input

    await handleAIQuery(prompt, image);
}

function explainSelectedText() {
    if (!state.selectedText) {
        showToast('Please select text first', 'info');
        return;
    }

    const prompt = `Explain this text: "${state.selectedText}"`;
    handleAIQuery(prompt);
}

function addChatMessage(content, type, image = null) {
    // Remove welcome message if present
    const welcome = elements.chatContainer.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const avatarSvg = type === 'user'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><circle cx="12" cy="12" r="3"/></svg>';

    let messageContentHtml = '';
    if (image) {
        messageContentHtml += `<img src="${image}" alt="User uploaded image" class="chat-image">`;
    }
    if (content) {
        messageContentHtml += `<div class="message-text">${content}</div>`;
    }

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarSvg}</div>
        <div class="message-content">${messageContentHtml}</div>
    `;

    elements.chatContainer.appendChild(messageDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

async function getAIResponse(prompt) {
    if (!state.apiKey) {
        showToast('Please set your API key in settings', 'error');
        toggleAISettings();
        return;
    }

    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai';
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><circle cx="12" cy="12" r="3"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="loading"><span></span><span></span><span></span></div>
        </div>
    `;
    elements.chatContainer.appendChild(loadingDiv);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

    try {
        let response;

        // Use backend proxy for secure API calls
        response = await callBackendAI(prompt, state.aiModel);

        loadingDiv.remove();
        addChatMessage(response, 'ai');

    } catch (error) {
        loadingDiv.remove();
        console.error('AI Error:', error);
        addChatMessage(`Error: ${error.message}`, 'ai');
        showToast('Failed to get AI response', 'error');
    }
}

// Backend AI Proxy Function
async function callBackendAI(prompt, model, image = null) {
    const endpoint = `/api/ai/${model}`;

    let requestBody;

    if (model === 'gemini') {
        requestBody = { prompt: prompt };
        if (image) {
            // Remove data URL prefix for Gemini if needed, or backend handles it
            requestBody.image = image;
        }
    } else if (model === 'openai') {
        const messages = [];
        if (image) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: prompt || "Analyze this image" },
                    { type: 'image_url', image_url: { url: image } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: prompt });
        }
        requestBody = { messages: messages };
    } else {
        // Anthropic and others
        requestBody = { messages: [{ role: 'user', content: prompt }] };
        if (image) {
            // Basic support for now, might need specific formatting
            requestBody.image = image;
        }
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `${model} API error`);
    }

    const data = await response.json();

    // Extract response based on model
    if (model === 'openai') {
        return data.choices[0].message.content;
    } else if (model === 'anthropic') {
        return data.content[0].text;
    } else if (model === 'gemini') {
        return data.candidates[0].content.parts[0].text;
    }
}

// Legacy functions kept for reference (now unused)
async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callAnthropic(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': state.apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0].text;
}

async function callGemini(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${state.apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(message, type = 'info') {
    const toast = elements.toast;
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast visible ${type}`;

    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// Search in PDF
async function searchInPDF() {
    const query = elements.searchInput.value.trim();
    if (!query || !state.pdfDoc) {
        showToast('Please enter a search term', 'error');
        return;
    }

    showToast('Searching...', 'info');
    state.searchResults = [];

    // Search through all pages
    for (let pageNum = 1; pageNum <= state.totalPages; pageNum++) {
        const page = await state.pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');

        if (pageText.toLowerCase().includes(query.toLowerCase())) {
            state.searchResults.push(pageNum);
        }
    }

    if (state.searchResults.length > 0) {
        state.currentSearchIndex = 0;
        state.currentPage = state.searchResults[0];
        await renderPage(state.currentPage);
        showToast(`Found ${state.searchResults.length} result(s)`, 'success');
    } else {
        showToast('No results found', 'error');
    }
}

// Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showToast('Fullscreen not supported', 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

// Recent Files Management
function addToRecentFiles(filename) {
    const fileEntry = {
        name: filename,
        date: new Date().toISOString()
    };

    // Remove if already exists
    state.recentFiles = state.recentFiles.filter(f => f.name !== filename);

    // Add to beginning
    state.recentFiles.unshift(fileEntry);

    // Keep only last 10
    state.recentFiles = state.recentFiles.slice(0, 10);

    localStorage.setItem('pdfReaderRecentFiles', JSON.stringify(state.recentFiles));
    updateRecentFilesList();
}

function updateRecentFilesList() {
    const list = elements.recentFilesList;

    if (state.recentFiles.length === 0) {
        list.innerHTML = '<p class="empty-state">No recent files</p>';
        return;
    }

    list.innerHTML = state.recentFiles.map(file => {
        const date = new Date(file.date);
        const timeAgo = getTimeAgo(date);

        return `
            <div class="recent-file-item" data-filename="${file.name}">
                <div class="recent-file-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                </div>
                <div class="recent-file-info">
                    <div class="recent-file-name">${file.name}</div>
                    <div class="recent-file-date">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    // Note: Recent files are just references, actual file opening still requires user to select the file
    list.querySelectorAll('.recent-file-item').forEach(item => {
        item.addEventListener('click', () => {
            showToast('Please select the file from your computer', 'info');
            elements.pdfInput.click();
            elements.recentFilesMenu.classList.remove('visible');
        });
    });
}

function toggleRecentFilesMenu() {
    elements.recentFilesMenu.classList.toggle('visible');
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

