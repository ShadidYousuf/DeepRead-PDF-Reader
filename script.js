/**
 * DeepRead - Document Intelligence Platform
 * Main Application Script
 */

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================
// Application State
// ============================================
const state = {
    // PDF State
    documents: new Map(), // docId -> { pdfDoc, name, pageCount, fullText }
    activeDocument: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.0,
    renderedPages: new Set(),
    pageObserver: null,

    // Highlights
    highlights: [],
    selectedColor: '#ffeb3b',
    selectedText: '',

    // AI
    aiModel: 'gemini',
    chatHistory: [],

    // UI State
    sidebarOpen: true,
    rightPanelOpen: true,
    activePanel: 'notes',
    thumbnailsVisible: false,

    // Notes
    slashMenuVisible: false,
    slashMenuPosition: { x: 0, y: 0 }
};

// ============================================
// DOM Elements
// ============================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
    // Sidebar
    sidebar: $('#sidebar'),
    sidebarToggle: $('#sidebarToggle'),
    uploadBtn: $('#uploadBtn'),
    fileInput: $('#fileInput'),
    globalSearch: $('#globalSearch'),
    collectionsList: $('#collectionsList'),
    kbDocsList: $('#kbDocsList'),
    kbCount: $('#kbCount'),
    settingsBtn: $('#settingsBtn'),

    // Topbar
    mobileMenuBtn: $('#mobileMenuBtn'),
    documentTabs: $('#documentTabs'),
    toggleThumbnails: $('#toggleThumbnails'),
    zoomIn: $('#zoomIn'),
    zoomOut: $('#zoomOut'),
    zoomLevel: $('#zoomLevel'),
    toggleNotes: $('#toggleNotes'),
    toggleAI: $('#toggleAI'),

    // Content
    thumbnailsPanel: $('#thumbnailsPanel'),
    thumbnailsList: $('#thumbnailsList'),
    viewerPanel: $('#viewerPanel'),
    welcomeScreen: $('#welcomeScreen'),
    pdfViewer: $('#pdfViewer'),
    pdfContainer: $('#pdfContainer'),
    pageNav: $('#pageNav'),
    prevPage: $('#prevPage'),
    nextPage: $('#nextPage'),
    currentPage: $('#currentPage'),
    totalPages: $('#totalPages'),

    // Right Panel
    rightPanel: $('#rightPanel'),
    panelTabs: $$('.panel-tab'),
    notesContent: $('#notesContent'),
    aiContent: $('#aiContent'),

    // Notes
    blockTypeSelect: $('#blockTypeSelect'),
    notesEditor: $('#notesEditor'),
    slashMenu: $('#slashMenu'),
    exportNotesBtn: $('#exportNotesBtn'),
    exportMenu: $('#exportMenu'),
    highlightsList: $('#highlightsList'),
    highlightCount: $('#highlightCount'),
    insertImageBtn: $('#insertImageBtn'),
    noteImageInput: $('#noteImageInput'),

    // AI
    aiModelSelect: $('#aiModelSelect'),
    aiSummaryCard: $('#aiSummaryCard'),
    summaryContent: $('#summaryContent'),
    summaryTopics: $('#summaryTopics'),
    chatContainer: $('#chatContainer'),
    chatWelcome: $('#chatWelcome'),
    chatMessages: $('#chatMessages'),
    suggestedQuestions: $('#suggestedQuestions'),
    chatInput: $('#chatInput'),
    sendMessageBtn: $('#sendMessageBtn'),
    explainSelectionBtn: $('#explainSelectionBtn'),

    // Selection Popup
    selectionPopup: $('#selectionPopup'),
    highlightBtn: $('#highlightBtn'),
    explainBtn: $('#explainBtn'),
    copyBtn: $('#copyBtn'),
    addToNotesBtn: $('#addToNotesBtn'),
    colorDots: $$('.color-dot'),

    // Modals
    settingsModal: $('#settingsModal'),
    closeSettingsBtn: $('#closeSettingsBtn'),
    cancelSettingsBtn: $('#cancelSettingsBtn'),
    saveSettingsBtn: $('#saveSettingsBtn'),
    apiKeyInput: $('#apiKeyInput'),

    // Other
    dropZone: $('#dropZone'),
    loadingOverlay: $('#loadingOverlay'),
    loadingText: $('#loadingText'),
    toastContainer: $('#toastContainer'),
    themeToggle: $('#themeToggle')
};

// ============================================
// Initialization
// ============================================
function init() {
    loadSavedData();
    setupTheme();
    setupEventListeners();
    setupDragAndDrop();
    setupKeyboardShortcuts();
    setupSlashCommands();
}

// ============================================
// Theme Management
// ============================================
function setupTheme() {
    const savedTheme = localStorage.getItem('deepread_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themes = ['dark', 'light', 'paperback'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('deepread_theme', newTheme);

    const themeNames = {
        'dark': 'Dark',
        'light': 'Light',
        'paperback': 'Paperback'
    };
    showToast(`Switched to ${themeNames[newTheme]} mode`, 'info');
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Theme Toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);

    // Sidebar
    elements.sidebarToggle?.addEventListener('click', toggleSidebar);
    elements.uploadBtn?.addEventListener('click', () => elements.fileInput?.click());
    elements.fileInput?.addEventListener('change', handleFileUpload);
    elements.mobileMenuBtn?.addEventListener('click', () => elements.sidebar?.classList.toggle('open'));
    elements.settingsBtn?.addEventListener('click', () => elements.settingsModal?.classList.remove('hidden'));

    // Navigation items
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            $$('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Topbar
    elements.toggleThumbnails?.addEventListener('click', toggleThumbnails);
    elements.zoomIn?.addEventListener('click', () => changeZoom(0.25));
    elements.zoomOut?.addEventListener('click', () => changeZoom(-0.25));
    elements.toggleNotes?.addEventListener('click', () => toggleRightPanel('notes'));
    elements.toggleAI?.addEventListener('click', () => toggleRightPanel('ai'));

    // Page Navigation
    elements.prevPage?.addEventListener('click', () => changePage(-1));
    elements.nextPage?.addEventListener('click', () => changePage(1));
    elements.currentPage?.addEventListener('change', handlePageInput);

    // Panel Tabs
    elements.panelTabs.forEach(tab => {
        tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
    });

    // Notes Editor
    elements.notesEditor?.addEventListener('input', debounce(saveNotes, 1000));
    elements.notesEditor?.addEventListener('keydown', handleEditorKeydown);
    elements.blockTypeSelect?.addEventListener('change', handleBlockTypeChange);

    // Format buttons
    $$('[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.execCommand(btn.dataset.format, false, null);
            elements.notesEditor?.focus();
        });
    });

    // Export
    elements.exportNotesBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.exportMenu?.classList.toggle('hidden');
    });

    $$('.dropdown-item[data-format]').forEach(item => {
        item.addEventListener('click', () => {
            exportNotes(item.dataset.format);
            elements.exportMenu?.classList.add('hidden');
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.toolbar-group')) {
            elements.exportMenu?.classList.add('hidden');
        }
    });

    // Image insert
    elements.insertImageBtn?.addEventListener('click', () => elements.noteImageInput?.click());
    elements.noteImageInput?.addEventListener('change', handleImageInsert);

    // AI
    elements.aiModelSelect?.addEventListener('change', (e) => {
        state.aiModel = e.target.value;
        localStorage.setItem('deepread_aiModel', state.aiModel);
    });

    elements.sendMessageBtn?.addEventListener('click', sendChatMessage);
    elements.chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Suggested questions
    $$('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            elements.chatInput.value = chip.textContent;
            sendChatMessage();
        });
    });

    elements.explainSelectionBtn?.addEventListener('click', explainSelectedText);

    // Selection Popup
    elements.highlightBtn?.addEventListener('click', highlightSelectedText);
    elements.explainBtn?.addEventListener('click', () => {
        hideSelectionPopup();
        explainSelectedText();
    });
    elements.copyBtn?.addEventListener('click', copySelectedText);
    elements.addToNotesBtn?.addEventListener('click', addSelectionToNotes);

    elements.colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            elements.colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            state.selectedColor = dot.dataset.color;
        });
    });

    // Text selection
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', (e) => {
        if (!elements.selectionPopup?.contains(e.target)) {
            hideSelectionPopup();
        }
        if (!elements.slashMenu?.contains(e.target)) {
            hideSlashMenu();
        }
    });

    // Settings Modal
    elements.closeSettingsBtn?.addEventListener('click', () => elements.settingsModal?.classList.add('hidden'));
    elements.cancelSettingsBtn?.addEventListener('click', () => elements.settingsModal?.classList.add('hidden'));
    elements.saveSettingsBtn?.addEventListener('click', saveSettings);

    // Modal backdrop click
    $('.modal-backdrop')?.addEventListener('click', () => elements.settingsModal?.classList.add('hidden'));

    // Slash menu items
    $$('.slash-item').forEach(item => {
        item.addEventListener('click', () => {
            insertBlock(item.dataset.type);
            hideSlashMenu();
        });
    });
}

// ============================================
// Drag & Drop
// ============================================
function setupDragAndDrop() {
    const dropZone = elements.dropZone || document.body;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        document.body.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('dragenter', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer?.files;
        if (files?.length > 0) {
            handleFiles(Array.from(files));
        }
    });

    // Also allow dropping anywhere
    document.body.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files?.length > 0) {
            handleFiles(Array.from(files));
        }
    });
}

// ============================================
// Keyboard Shortcuts
// ============================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Cmd/Ctrl + K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            elements.globalSearch?.focus();
        }

        // Page navigation
        if (e.key === 'ArrowLeft') changePage(-1);
        if (e.key === 'ArrowRight') changePage(1);

        // Zoom
        if (e.ctrlKey || e.metaKey) {
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                changeZoom(0.25);
            }
            if (e.key === '-') {
                e.preventDefault();
                changeZoom(-0.25);
            }
        }
    });

    // Editor shortcuts
    elements.notesEditor?.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline');
                    break;
            }
        }
    });
}

// ============================================
// Slash Commands
// ============================================
function setupSlashCommands() {
    elements.notesEditor?.addEventListener('input', (e) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const text = range.startContainer.textContent || '';
        const offset = range.startOffset;

        // Check if typing /
        if (text.charAt(offset - 1) === '/') {
            showSlashMenu();
        } else if (!text.includes('/')) {
            hideSlashMenu();
        }
    });
}

function showSlashMenu() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    elements.slashMenu.style.left = `${rect.left}px`;
    elements.slashMenu.style.top = `${rect.bottom + 8}px`;
    elements.slashMenu.classList.remove('hidden');
    state.slashMenuVisible = true;
}

function hideSlashMenu() {
    elements.slashMenu?.classList.add('hidden');
    state.slashMenuVisible = false;
}

function insertBlock(type) {
    // Remove the slash
    document.execCommand('delete');

    switch (type) {
        case 'h1':
            document.execCommand('formatBlock', false, 'h1');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, 'h2');
            break;
        case 'h3':
            document.execCommand('formatBlock', false, 'h3');
            break;
        case 'quote':
            document.execCommand('formatBlock', false, 'blockquote');
            break;
        case 'code':
            document.execCommand('formatBlock', false, 'pre');
            break;
        case 'ul':
            document.execCommand('insertUnorderedList');
            break;
        case 'ol':
            document.execCommand('insertOrderedList');
            break;
        case 'todo':
            insertTodoItem();
            break;
        case 'divider':
            document.execCommand('insertHorizontalRule');
            break;
        case 'ai-summarize':
            generateAISummary();
            break;
        case 'ai-explain':
            generateAIExplanation();
            break;
        default:
            document.execCommand('formatBlock', false, 'p');
    }

    elements.notesEditor?.focus();
}

function insertTodoItem() {
    const checkbox = document.createElement('div');
    checkbox.innerHTML = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" style="width: 16px; height: 16px;">
        <span contenteditable="true">Todo item</span>
    </label>`;

    const selection = window.getSelection();
    if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(checkbox);
    }
}

// ============================================
// File Handling
// ============================================
async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    await handleFiles(files);
    e.target.value = '';
}

async function handleFiles(files) {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');

    if (pdfFiles.length === 0) {
        showToast('Please upload PDF files', 'error');
        return;
    }

    showLoading('Loading documents...');

    for (const file of pdfFiles) {
        try {
            await loadPDF(file);
        } catch (error) {
            console.error('Error loading PDF:', error);
            showToast(`Failed to load ${file.name}`, 'error');
        }
    }

    hideLoading();
    showToast(`Loaded ${pdfFiles.length} document(s)`, 'success');
}

async function loadPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract full text for RAG
    let fullText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    // Store document
    state.documents.set(docId, {
        pdfDoc,
        name: file.name,
        pageCount: pdfDoc.numPages,
        fullText
    });

    // Update UI
    updateKnowledgeBase();
    addDocumentTab(docId, file.name);

    // Index for RAG
    indexDocument(docId, file.name, fullText);

    // Open this document
    openDocument(docId);
}

async function indexDocument(docId, filename, text) {
    try {
        await fetch('/api/rag/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ docId, filename, text })
        });
    } catch (error) {
        console.log('RAG indexing skipped (server may not be running)');
    }
}

function updateKnowledgeBase() {
    const count = state.documents.size;
    if (elements.kbCount) {
        elements.kbCount.textContent = count;
    }

    // Update KB docs list
    if (elements.kbDocsList) {
        elements.kbDocsList.innerHTML = Array.from(state.documents.entries()).map(([id, doc]) => `
            <li class="nav-item" data-doc-id="${id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span>${doc.name}</span>
            </li>
        `).join('');

        // Add click handlers
        elements.kbDocsList.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => openDocument(item.dataset.docId));
        });
    }
}

function addDocumentTab(docId, name) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.doc = docId;
    tab.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
        </svg>
        <span>${name.length > 20 ? name.substring(0, 20) + '...' : name}</span>
        <button class="tab-close" onclick="closeDocument('${docId}', event)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    tab.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) {
            openDocument(docId);
        }
    });

    // Remove welcome tab if exists
    const welcomeTab = elements.documentTabs?.querySelector('[data-doc="welcome"]');
    welcomeTab?.remove();

    elements.documentTabs?.appendChild(tab);
}

window.closeDocument = function (docId, event) {
    event?.stopPropagation();

    state.documents.delete(docId);
    updateKnowledgeBase();

    // Remove tab
    const tab = elements.documentTabs?.querySelector(`[data-doc="${docId}"]`);
    tab?.remove();

    // If this was the active document, open another or show welcome
    if (state.activeDocument === docId) {
        const remaining = Array.from(state.documents.keys());
        if (remaining.length > 0) {
            openDocument(remaining[0]);
        } else {
            showWelcomeScreen();
        }
    }
};

function openDocument(docId) {
    const doc = state.documents.get(docId);
    if (!doc) return;

    state.activeDocument = docId;
    state.currentPage = 1;
    state.totalPages = doc.pageCount;
    state.renderedPages.clear();

    // Update tabs
    $$('.tab').forEach(t => t.classList.remove('active'));
    elements.documentTabs?.querySelector(`[data-doc="${docId}"]`)?.classList.add('active');

    // Hide welcome, show PDF viewer
    elements.welcomeScreen?.classList.add('hidden');
    elements.pdfViewer?.classList.remove('hidden');
    elements.pageNav?.classList.remove('hidden');

    // Update page info
    if (elements.totalPages) elements.totalPages.textContent = state.totalPages;
    if (elements.currentPage) elements.currentPage.value = 1;

    // Render PDF
    renderAllPages(doc.pdfDoc);

    // Generate AI summary
    generateDocumentSummary(docId);
}

function showWelcomeScreen() {
    state.activeDocument = null;
    elements.welcomeScreen?.classList.remove('hidden');
    elements.pdfViewer?.classList.add('hidden');
    elements.pageNav?.classList.add('hidden');

    // Add welcome tab back
    if (!elements.documentTabs?.querySelector('[data-doc="welcome"]')) {
        const welcomeTab = document.createElement('div');
        welcomeTab.className = 'tab active';
        welcomeTab.dataset.doc = 'welcome';
        welcomeTab.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>Welcome</span>
        `;
        elements.documentTabs?.prepend(welcomeTab);
    }
}

// ============================================
// PDF Rendering
// ============================================
async function renderAllPages(pdfDoc) {
    if (!elements.pdfContainer) return;

    elements.pdfContainer.innerHTML = '';
    state.renderedPages.clear();

    // Calculate scale to fit width
    const containerWidth = elements.pdfContainer.clientWidth - 48;
    const firstPage = await pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    state.scale = Math.min(containerWidth / viewport.width, 1.5);

    updateZoomDisplay();

    // Create page containers
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
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
        elements.pdfContainer.appendChild(pageContainer);

        // Render first pages immediately
        if (pageNum <= 3) {
            await renderPage(pdfDoc, pageNum);
        }
    }

    // Setup intersection observer
    setupPageObserver(pdfDoc);

    // Render thumbnails
    if (state.thumbnailsVisible) {
        renderThumbnails(pdfDoc);
    }
}

async function renderPage(pdfDoc, pageNum) {
    if (state.renderedPages.has(pageNum)) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    const canvas = document.getElementById(`page-${pageNum}`);
    if (!canvas) return;

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Render text layer
    const textLayer = document.getElementById(`text-layer-${pageNum}`);
    if (textLayer) {
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
    }

    // Render highlights
    renderHighlightsForPage(pageNum);

    state.renderedPages.add(pageNum);
}

function setupPageObserver(pdfDoc) {
    if (state.pageObserver) {
        state.pageObserver.disconnect();
    }

    state.pageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const pageNum = parseInt(entry.target.dataset.pageNumber);

            if (entry.isIntersecting) {
                if (!state.renderedPages.has(pageNum)) {
                    renderPage(pdfDoc, pageNum);
                }

                if (entry.intersectionRatio > 0.5) {
                    state.currentPage = pageNum;
                    if (elements.currentPage) {
                        elements.currentPage.value = pageNum;
                    }

                    // Update thumbnail active state
                    $$('.thumbnail').forEach(t => t.classList.remove('active'));
                    document.querySelector(`.thumbnail[data-page="${pageNum}"]`)?.classList.add('active');
                }
            }
        });
    }, {
        root: elements.pdfContainer,
        threshold: [0, 0.5, 1]
    });

    $$('.pdf-page-container').forEach(container => {
        state.pageObserver.observe(container);
    });
}

async function renderThumbnails(pdfDoc) {
    if (!elements.thumbnailsList) return;

    elements.thumbnailsList.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 0.2;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;

        const thumbnail = document.createElement('div');
        thumbnail.className = `thumbnail ${pageNum === state.currentPage ? 'active' : ''}`;
        thumbnail.dataset.page = pageNum;
        thumbnail.innerHTML = `
            <img src="${canvas.toDataURL()}" alt="Page ${pageNum}">
            <span class="thumbnail-number">${pageNum}</span>
        `;

        thumbnail.addEventListener('click', () => {
            const container = document.querySelector(`[data-page-number="${pageNum}"]`);
            container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        elements.thumbnailsList.appendChild(thumbnail);
    }

    if (elements.pageCount) {
        elements.pageCount.textContent = `${pdfDoc.numPages} pages`;
    }
}

// ============================================
// Navigation & Zoom
// ============================================
function changePage(delta) {
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
        const container = document.querySelector(`[data-page-number="${newPage}"]`);
        container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function handlePageInput(e) {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= state.totalPages) {
        const container = document.querySelector(`[data-page-number="${page}"]`);
        container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        e.target.value = state.currentPage;
    }
}

function changeZoom(delta) {
    state.scale = Math.max(0.5, Math.min(3, state.scale + delta));
    updateZoomDisplay();

    // Re-render all pages
    const doc = state.documents.get(state.activeDocument);
    if (doc) {
        state.renderedPages.clear();
        renderAllPages(doc.pdfDoc);
    }
}

function updateZoomDisplay() {
    if (elements.zoomLevel) {
        elements.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
    }
}

// ============================================
// UI Toggles
// ============================================
function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    elements.sidebar?.classList.toggle('collapsed');
}

function toggleThumbnails() {
    state.thumbnailsVisible = !state.thumbnailsVisible;
    elements.thumbnailsPanel?.classList.toggle('hidden');
    elements.toggleThumbnails?.classList.toggle('active');

    if (state.thumbnailsVisible && state.activeDocument) {
        const doc = state.documents.get(state.activeDocument);
        if (doc) renderThumbnails(doc.pdfDoc);
    }
}

function toggleRightPanel(panel) {
    if (state.activePanel === panel && state.rightPanelOpen) {
        // Close panel
        state.rightPanelOpen = false;
        elements.rightPanel?.classList.add('hidden');
        elements.toggleNotes?.classList.remove('active');
        elements.toggleAI?.classList.remove('active');
    } else {
        // Open/switch panel
        state.rightPanelOpen = true;
        state.activePanel = panel;
        elements.rightPanel?.classList.remove('hidden');
        switchPanel(panel);

        elements.toggleNotes?.classList.toggle('active', panel === 'notes');
        elements.toggleAI?.classList.toggle('active', panel === 'ai');
    }
}

function switchPanel(panel) {
    state.activePanel = panel;

    elements.panelTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.panel === panel);
    });

    elements.notesContent?.classList.toggle('active', panel === 'notes');
    elements.aiContent?.classList.toggle('active', panel === 'ai');
}

// ============================================
// Text Selection & Highlighting
// ============================================
function handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && elements.pdfContainer?.contains(selection.anchorNode)) {
        state.selectedText = text;
        showSelectionPopup(e);
    }
}

function showSelectionPopup(e) {
    if (!elements.selectionPopup) return;

    elements.selectionPopup.style.left = `${e.pageX - 100}px`;
    elements.selectionPopup.style.top = `${e.pageY - 50}px`;
    elements.selectionPopup.classList.remove('hidden');
}

function hideSelectionPopup() {
    elements.selectionPopup?.classList.add('hidden');
}

function highlightSelectedText() {
    if (!state.selectedText) return;

    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();

    if (rects.length === 0) return;

    // Find the page container that contains this selection
    let pageContainer = range.startContainer;
    while (pageContainer && !pageContainer.classList?.contains('pdf-page-container')) {
        pageContainer = pageContainer.parentElement;
    }

    if (!pageContainer) return;

    const pageNum = parseInt(pageContainer.dataset.pageNumber);
    const pageRect = pageContainer.getBoundingClientRect();

    // Create highlight marks for each rect (handles multi-line selections)
    const highlightRects = [];
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        highlightRects.push({
            x: rect.left - pageRect.left,
            y: rect.top - pageRect.top,
            width: rect.width,
            height: rect.height
        });
    }

    const highlight = {
        id: Date.now(),
        docId: state.activeDocument,
        page: pageNum,
        text: state.selectedText,
        color: state.selectedColor,
        rects: highlightRects
    };

    state.highlights.push(highlight);
    saveHighlights();
    renderHighlightsForPage(pageNum);
    updateHighlightsList();

    selection.removeAllRanges();
    hideSelectionPopup();
    showToast('Text highlighted', 'success');
}

function renderHighlightsForPage(pageNum) {
    const highlightLayer = document.getElementById(`highlight-layer-${pageNum}`);
    if (!highlightLayer) return;

    highlightLayer.innerHTML = '';

    const pageHighlights = state.highlights.filter(h =>
        h.docId === state.activeDocument && h.page === pageNum
    );

    pageHighlights.forEach(highlight => {
        // Support both new rects array and legacy single rect
        const rectsToRender = highlight.rects || [highlight.rect];

        rectsToRender.forEach(rect => {
            if (!rect) return;

            const mark = document.createElement('div');
            mark.className = 'highlight-mark';
            mark.style.position = 'absolute';
            mark.style.left = `${rect.x}px`;
            mark.style.top = `${rect.y}px`;
            mark.style.width = `${rect.width}px`;
            mark.style.height = `${rect.height}px`;

            // Convert color to rgba with lower opacity
            let bgColor;
            if (highlight.color.startsWith('#')) {
                const r = parseInt(highlight.color.slice(1, 3), 16);
                const g = parseInt(highlight.color.slice(3, 5), 16);
                const b = parseInt(highlight.color.slice(5, 7), 16);
                bgColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
            } else if (highlight.color.includes('rgb')) {
                bgColor = highlight.color.replace(')', ', 0.25)').replace('rgba', 'rgb').replace('rgb', 'rgba');
            } else {
                bgColor = highlight.color;
            }
            mark.style.backgroundColor = bgColor;
            mark.title = highlight.text.substring(0, 50) + (highlight.text.length > 50 ? '...' : '');

            highlightLayer.appendChild(mark);
        });
    });
}

function updateHighlightsList() {
    if (!elements.highlightsList) return;

    const docHighlights = state.highlights.filter(h => h.docId === state.activeDocument);

    if (elements.highlightCount) {
        elements.highlightCount.textContent = docHighlights.length;
    }

    if (docHighlights.length === 0) {
        elements.highlightsList.innerHTML = '<p class="empty-state">No highlights yet</p>';
        return;
    }

    elements.highlightsList.innerHTML = docHighlights.map(h => `
        <div class="highlight-item" data-page="${h.page}">
            <div class="highlight-color-dot" style="background: ${h.color}"></div>
            <span class="highlight-text">${h.text}</span>
        </div>
    `).join('');

    elements.highlightsList.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = parseInt(item.dataset.page);
            const container = document.querySelector(`[data-page-number="${page}"]`);
            container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

function copySelectedText() {
    if (state.selectedText) {
        navigator.clipboard.writeText(state.selectedText);
        hideSelectionPopup();
        showToast('Copied to clipboard', 'success');
    }
}

function addSelectionToNotes() {
    if (state.selectedText && elements.notesEditor) {
        const quote = document.createElement('blockquote');
        quote.textContent = state.selectedText;
        elements.notesEditor.appendChild(quote);
        elements.notesEditor.appendChild(document.createElement('p'));
        saveNotes();
        hideSelectionPopup();
        showToast('Added to notes', 'success');
        switchPanel('notes');
    }
}

// ============================================
// Notes Editor
// ============================================
function handleEditorKeydown(e) {
    // Handle slash menu navigation
    if (state.slashMenuVisible) {
        if (e.key === 'Escape') {
            hideSlashMenu();
            e.preventDefault();
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            // TODO: Navigate slash menu
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            // TODO: Select current slash menu item
        }
    }
}

function handleBlockTypeChange(e) {
    const type = e.target.value;
    document.execCommand('formatBlock', false, type);
    elements.notesEditor?.focus();
}

function handleImageInsert(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.margin = '8px 0';

        const selection = window.getSelection();
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.insertNode(img);
            range.collapse(false);
        }

        saveNotes();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function saveNotes() {
    if (elements.notesEditor) {
        localStorage.setItem('deepread_notes', elements.notesEditor.innerHTML);
    }
}

// ============================================
// AI Features
// ============================================
async function generateDocumentSummary(docId) {
    const doc = state.documents.get(docId);
    if (!doc) return;

    // Show summary card
    elements.aiSummaryCard?.classList.remove('hidden');
    if (elements.summaryContent) {
        elements.summaryContent.innerHTML = '<div class="loading-text">Generating summary...</div>';
    }

    try {
        const response = await callAI(`Please provide a concise summary of this document in 2-3 sentences, and list 3-5 key topics:\n\n${doc.fullText.substring(0, 5000)}`);

        if (elements.summaryContent) {
            elements.summaryContent.innerHTML = marked.parse(response);
        }
    } catch (error) {
        console.error('Summary generation failed:', error);
        if (elements.summaryContent) {
            elements.summaryContent.innerHTML = '<p class="text-muted">Upload a document to see AI summary</p>';
        }
    }
}

async function sendChatMessage() {
    const message = elements.chatInput?.value.trim();
    if (!message) return;

    // Clear input
    elements.chatInput.value = '';

    // Hide welcome, show messages
    elements.chatWelcome?.classList.add('hidden');

    // Add user message
    addChatMessage('user', message);

    // Get context from active document AND notes
    let context = '';

    // Add document context
    if (state.activeDocument) {
        const doc = state.documents.get(state.activeDocument);
        if (doc && doc.fullText) {
            context += `=== DOCUMENT CONTENT ===\n${doc.fullText.substring(0, 6000)}\n\n`;
        }
    }

    // Add notes context
    const notesContent = elements.notesEditor?.innerText?.trim();
    if (notesContent) {
        context += `=== USER NOTES ===\n${notesContent.substring(0, 2000)}\n\n`;
    }

    // Add highlights context
    const docHighlights = state.highlights.filter(h => h.docId === state.activeDocument);
    if (docHighlights.length > 0) {
        const highlightTexts = docHighlights.map(h => `- "${h.text}"`).join('\n');
        context += `=== HIGHLIGHTED TEXT ===\n${highlightTexts.substring(0, 1000)}\n\n`;
    }

    // Add thinking indicator
    const thinkingId = addChatMessage('ai', '<div class="loading-text">Thinking...</div>');

    try {
        const response = await callAI(message, context);
        updateChatMessage(thinkingId, response);
    } catch (error) {
        console.error('AI Error:', error);
        updateChatMessage(thinkingId, 'Sorry, I encountered an error. Please check your API settings and try again.');
    }
}

function addChatMessage(role, content) {
    const id = `msg_${Date.now()}`;
    const avatar = role === 'user'
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
           </svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <circle cx="12" cy="12" r="3"/>
           </svg>`;

    const messageHtml = `
        <div class="chat-message" id="${id}">
            <div class="message-avatar ${role}">${avatar}</div>
            <div class="message-content ${role}">${content}</div>
        </div>
    `;

    if (elements.chatMessages) {
        elements.chatMessages.innerHTML += messageHtml;
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }

    return id;
}

function updateChatMessage(id, content) {
    const message = document.getElementById(id);
    if (message) {
        const contentEl = message.querySelector('.message-content');
        if (contentEl) {
            contentEl.innerHTML = marked.parse(content);
        }
    }
}

async function explainSelectedText() {
    if (!state.selectedText) {
        showToast('Please select some text first', 'info');
        return;
    }

    // Switch to AI panel
    toggleRightPanel('ai');

    // Send as chat message
    elements.chatInput.value = `Explain this: "${state.selectedText}"`;
    sendChatMessage();

    hideSelectionPopup();
}

async function generateAISummary() {
    if (!state.activeDocument) {
        showToast('Please open a document first', 'info');
        return;
    }

    const doc = state.documents.get(state.activeDocument);
    if (!doc) return;

    showToast('Generating summary...', 'info');

    try {
        const response = await callAI(`Summarize this document:\n\n${doc.fullText.substring(0, 5000)}`);

        // Insert into editor
        const summary = document.createElement('div');
        summary.innerHTML = `<h2>AI Summary</h2>${marked.parse(response)}`;
        elements.notesEditor?.appendChild(summary);
        saveNotes();

        showToast('Summary added to notes', 'success');
    } catch (error) {
        showToast('Failed to generate summary', 'error');
    }
}

async function generateAIExplanation() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) {
        showToast('Please select some text first', 'info');
        return;
    }

    try {
        const response = await callAI(`Explain this concept: "${selection}"`);

        // Insert into editor
        const explanation = document.createElement('div');
        explanation.innerHTML = `<blockquote>${selection}</blockquote><p><strong>Explanation:</strong></p>${marked.parse(response)}`;
        elements.notesEditor?.appendChild(explanation);
        saveNotes();

        showToast('Explanation added', 'success');
    } catch (error) {
        showToast('Failed to generate explanation', 'error');
    }
}

async function callAI(prompt, context = '') {
    const systemPrompt = context
        ? `You are a helpful AI assistant analyzing documents. Use the following document context to answer questions:\n\n${context}\n\n`
        : 'You are a helpful AI assistant.';

    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: state.aiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('AI request failed');
    }

    const data = await response.json();
    return data.response || data.content || 'No response received';
}

// ============================================
// Export
// ============================================
function exportNotes(format) {
    const content = elements.notesEditor?.innerHTML;
    if (!content?.trim()) {
        showToast('No notes to export', 'info');
        return;
    }

    switch (format) {
        case 'md':
            exportToMarkdown(content);
            break;
        case 'docx':
            exportToWord(content);
            break;
        case 'pdf':
            exportToPDF(content);
            break;
    }
}

function exportToMarkdown(html) {
    let markdown = html
        .replace(/<div>/g, '\n')
        .replace(/<\/div>/g, '')
        .replace(/<br>/g, '\n')
        .replace(/<b>|<strong>/g, '**').replace(/<\/b>|<\/strong>/g, '**')
        .replace(/<i>|<em>/g, '*').replace(/<\/i>|<\/em>/g, '*')
        .replace(/<u>/g, '__').replace(/<\/u>/g, '__')
        .replace(/<h1>/g, '# ').replace(/<\/h1>/g, '\n\n')
        .replace(/<h2>/g, '## ').replace(/<\/h2>/g, '\n\n')
        .replace(/<h3>/g, '### ').replace(/<\/h3>/g, '\n\n')
        .replace(/<blockquote>/g, '> ').replace(/<\/blockquote>/g, '\n')
        .replace(/<ul>/g, '').replace(/<\/ul>/g, '\n')
        .replace(/<ol>/g, '').replace(/<\/ol>/g, '\n')
        .replace(/<li>/g, '- ').replace(/<\/li>/g, '\n')
        .replace(/<p>/g, '').replace(/<\/p>/g, '\n\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, '');

    downloadFile(markdown, 'notes.md', 'text/markdown');
    showToast('Exported to Markdown', 'success');
}

async function exportToWord(html) {
    if (typeof docx === 'undefined') {
        showToast('Word export not available', 'error');
        return;
    }

    const doc = new docx.Document({
        sections: [{
            children: [
                new docx.Paragraph({
                    children: [new docx.TextRun(html.replace(/<[^>]+>/g, ''))]
                })
            ]
        }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, 'notes.docx');
    showToast('Exported to Word', 'success');
}

async function exportToPDF(html) {
    if (typeof jspdf === 'undefined') {
        showToast('PDF export not available', 'error');
        return;
    }

    const { jsPDF } = jspdf;
    const pdf = new jsPDF();

    pdf.setFont('helvetica');
    pdf.setFontSize(12);

    const text = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    const lines = pdf.splitTextToSize(text, 180);

    let y = 20;
    lines.forEach(line => {
        if (y > 280) {
            pdf.addPage();
            y = 20;
        }
        pdf.text(line, 15, y);
        y += 7;
    });

    pdf.save('notes.pdf');
    showToast('Exported to PDF', 'success');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================
// Settings
// ============================================
function saveSettings() {
    const apiKey = elements.apiKeyInput?.value;
    if (apiKey) {
        localStorage.setItem('deepread_apiKey', apiKey);
    }

    elements.settingsModal?.classList.add('hidden');
    showToast('Settings saved', 'success');
}

// ============================================
// Storage
// ============================================
function loadSavedData() {
    // Load notes
    const savedNotes = localStorage.getItem('deepread_notes');
    if (savedNotes && elements.notesEditor) {
        elements.notesEditor.innerHTML = savedNotes;
    }

    // Load highlights
    const savedHighlights = localStorage.getItem('deepread_highlights');
    if (savedHighlights) {
        state.highlights = JSON.parse(savedHighlights);
    }

    // Load AI model preference
    const savedModel = localStorage.getItem('deepread_aiModel');
    if (savedModel && elements.aiModelSelect) {
        state.aiModel = savedModel;
        elements.aiModelSelect.value = savedModel;
    }
}

function saveHighlights() {
    localStorage.setItem('deepread_highlights', JSON.stringify(state.highlights));
}

// ============================================
// Utilities
// ============================================
function showLoading(message = 'Loading...') {
    if (elements.loadingText) elements.loadingText.textContent = message;
    elements.loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay?.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;

    elements.toastContainer?.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', init);
