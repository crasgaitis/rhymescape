// ==================== STATE MANAGEMENT ====================
const state = {
    text: '',
    highlights: [], // { start, end, colorIndex }
    palette: 'sunset',
    customPalette: null,
    editMode: true,
    highlightMode: false,
    currentColorIndex: 0,
    colorHistory: {},
    history: [],
    historyIndex: -1,
};

const palettes = {
    sunset: ['#fff5e1', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#f57c00', '#e65100'],
    forest: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#388e3c', '#1b5e20'],
    ocean: ['#e1f5fe', '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#0277bd'],
    twilight: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#7b1fa2', '#4a148c'],
    earth: ['#fbe9e7', '#ffccbc', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#e64a19', '#bf360c'],
    mint: ['#e0f2f1', '#b2dfdb', '#80cbc4', '#4db6ac', '#26a69a', '#009688', '#00897b', '#00695c'],
};

// ==================== HISTORY/UNDO ====================
function saveToHistory() {
    const snapshot = {
        text: state.text,
        highlights: JSON.parse(JSON.stringify(state.highlights)),
        currentColorIndex: state.currentColorIndex,
        colorHistory: JSON.parse(JSON.stringify(state.colorHistory)),
    };
    
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    state.historyIndex++;
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreFromHistory(state.history[state.historyIndex]);
        render();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreFromHistory(state.history[state.historyIndex]);
        render();
    }
}

function restoreFromHistory(snapshot) {
    state.text = snapshot.text;
    state.highlights = JSON.parse(JSON.stringify(snapshot.highlights));
    state.currentColorIndex = snapshot.currentColorIndex;
    state.colorHistory = JSON.parse(JSON.stringify(snapshot.colorHistory));
}

// ==================== UTILITY FUNCTIONS ====================
function generateGradient(startColor, middleColor, endColor, steps = 10) {
    const colors = [];
    const start = hexToRgb(startColor);
    const middle = hexToRgb(middleColor);
    const end = hexToRgb(endColor);

    for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        let r, g, b;

        if (ratio < 0.5) {
            const midRatio = ratio * 2;
            r = Math.round(start.r + (middle.r - start.r) * midRatio);
            g = Math.round(start.g + (middle.g - start.g) * midRatio);
            b = Math.round(start.b + (middle.b - start.b) * midRatio);
        } else {
            const midRatio = (ratio - 0.5) * 2;
            r = Math.round(middle.r + (end.r - middle.r) * midRatio);
            g = Math.round(middle.g + (end.g - middle.g) * midRatio);
            b = Math.round(middle.b + (end.b - middle.b) * midRatio);
        }

        colors.push(rgbToHex(r, g, b));
    }
    return colors;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function showStatus(message, type = 'success') {
    const status = document.createElement('div');
    status.className = `status ${type}`;
    status.textContent = message;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 3000);
}

function getColorForIndex(colorIndex) {
    if (state.colorHistory[colorIndex]) {
        return state.colorHistory[colorIndex];
    }
    return getCurrentPalette()[colorIndex % getCurrentPalette().length];
}

function getCurrentPalette() {
    if (state.customPalette) return state.customPalette;
    return palettes[state.palette] || palettes.sunset;
}

function getHighlightCountByColor() {
    const counts = {};
    state.highlights.forEach(h => {
        const color = getColorForIndex(h.colorIndex);
        counts[color] = (counts[color] || 0) + (h.end - h.start);
    });
    return counts;
}

function downloadJSON() {
    const data = {
        text: state.text,
        highlights: state.highlights,
        palette: state.palette,
        customPalette: state.customPalette,
        colorHistory: state.colorHistory,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rhyme-highlight.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Downloaded as JSON');
}

function generateShareableLink() {
    const data = {
        text: state.text,
        highlights: state.highlights,
        palette: state.palette,
        customPalette: state.customPalette,
        colorHistory: state.colorHistory,
    };
    const json = JSON.stringify(data);
    const compressed = btoa(json);
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const link = `${baseUrl}?data=${encodeURIComponent(compressed)}`;
    
    const modal = document.getElementById('shareModal');
    document.getElementById('shareLink').value = link;
    modal.classList.add('active');
}

function importJSON() {
    const modal = document.getElementById('importModal');
    modal.classList.add('active');
}

function processImportJSON() {
    const json = document.getElementById('importText').value;
    try {
        const data = JSON.parse(json);
        state.text = data.text || '';
        state.highlights = data.highlights || [];
        state.palette = data.palette || 'sunset';
        state.customPalette = data.customPalette || null;
        state.colorHistory = data.colorHistory || {};
        saveToHistory();
        document.getElementById('importModal').classList.remove('active');
        document.getElementById('importText').value = '';
        render();
        showStatus('Imported successfully');
    } catch (e) {
        showStatus('Invalid JSON', 'error');
    }
}

function loadSharedData() {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    
    if (data) {
        try {
            const json = atob(decodeURIComponent(data));
            const shared = JSON.parse(json);
            state.text = shared.text || '';
            state.highlights = shared.highlights || [];
            state.palette = shared.palette || 'sunset';
            state.customPalette = shared.customPalette || null;
            state.colorHistory = shared.colorHistory || {};
            state.editMode = false;
            return true;
        } catch (e) {
            console.error('Failed to load shared data', e);
            return false;
        }
    }
    return false;
}

// ==================== EDITOR FUNCTIONS ====================
function toggleHighlightMode() {
    state.highlightMode = !state.highlightMode;
    render();
}

function cycleColor() {
    state.currentColorIndex++;
    render();
}

function applyHighlight(start, end) {
    if (end <= start) return;

    // Remove overlapping highlights
    state.highlights = state.highlights.filter(h => !(h.start < end && h.end > start));

    // state.highlights.push({
    //     start,
    //     end,
    //     colorIndex: state.currentColorIndex,
    // });

    state.highlights.push({
        id: crypto.randomUUID(),
        start,
        end,
        colorIndex: state.currentColorIndex,
    });

    state.colorHistory[state.currentColorIndex] = getCurrentPalette()[state.currentColorIndex % getCurrentPalette().length];
    
    saveToHistory();
    render();
}

function removeHighlightAtPosition(pos) {
    state.highlights = state.highlights.filter(h => !(h.start <= pos && h.end > pos));
    saveToHistory();
}

function deleteHighlight(index) {
    state.highlights.splice(index, 1);
    saveToHistory();
    render();
    showStatus('Highlight removed');
}

function clearAll() {
    if (confirm('Are you sure you want to clear all highlights?')) {
        state.highlights = [];
        saveToHistory();
        render();
        showStatus('Cleared all');
    }
}

function previewPublished() {
    state.editMode = false;
    renderApp();
}

function exitPreview() {
    state.editMode = true;
    renderApp();
}

function editAsNew() {
    window.history.replaceState({}, document.title, window.location.pathname);
    state.editMode = true;
    renderApp();
}

// ==================== RENDERING ====================
function renderEditor() {
    const editor = document.getElementById('editor');
    const text = state.text;

    let html = '';
    const marks = [];

    state.highlights.forEach((h, i) => {
        marks.push({ type: 'highlight', start: h.start, end: h.end, data: h, index: i });
    });
    marks.sort((a, b) => a.start - b.start);

    let i = 0;
    while (i < text.length) {
        const overlapping = marks.filter(m => m.start === i);

        if (overlapping.length > 0) {
            const mark = overlapping[0];
            const sliceEnd = mark.end;
            const slice = text.slice(i, sliceEnd);
            const color = getColorForIndex(mark.data.colorIndex);

            html += `<span class="highlight" style="background-color: ${color};" data-id="${mark.data.id}">${escapeHtml(slice)}</span>`;

            i = sliceEnd;
        } else {
            const char = text[i];

            // if (char === '\n') {
            //     html += '<br>';
            // } else {
            html += escapeHtml(char);
            // }

            i++;
        }
    }

    editor.innerHTML = html;


    // Attach event listeners to highlights
    document.querySelectorAll('.highlight').forEach(el => {
        // el.addEventListener('click', (e) => {
        //     e.stopPropagation();

        //     const index = parseInt(el.dataset.highlight);
        //     const highlight = state.highlights[index];

        //     if (state.highlightMode) {
        //         // remove ONLY this specific segment
        //         state.highlights.splice(index, 1);
        //         saveToHistory();
        //         render();
        //         showStatus('Highlight removed');
        //     }
        // });

        el.addEventListener('click', (e) => {
            e.stopPropagation();

            const id = el.dataset.id;

            if (state.highlightMode) {
                state.highlights = state.highlights.filter(h => h.id !== id);
                saveToHistory();
                render();
                showStatus('Highlight removed');
            }
        });

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            cycleColor();
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const palette = getCurrentPalette();
    const currentColor = getColorForIndex(state.currentColorIndex);

    // Color Palette
    const paletteHTML = palette.map(color => 
        `<div class="palette-color" style="background-color: ${color};">
            <span class="palette-color-label">${color}</span>
        </div>`
    ).join('');

    // Color Bar Chart
    const highlightCounts = getHighlightCountByColor();
    const colorBar = Object.entries(highlightCounts).map(([color, count]) => {
        const totalChars = Object.values(highlightCounts).reduce((a, b) => a + b, 0);
        const percentage = (count / totalChars * 100).toFixed(0);
        return `<div class="color-bar-segment" style="background-color: ${color}; flex: ${count};" title="${count} characters">${percentage}%</div>`;
    }).join('');

    sidebar.innerHTML = `
        <div class="sidebar-section">
            <h3>Color Palette</h3>
            <select class="palette-select" onchange="changePalette(this.value)">
                <option value="sunset" ${state.palette === 'sunset' && !state.customPalette ? 'selected' : ''}>Sunset</option>
                <option value="forest" ${state.palette === 'forest' && !state.customPalette ? 'selected' : ''}>Forest</option>
                <option value="ocean" ${state.palette === 'ocean' && !state.customPalette ? 'selected' : ''}>Ocean</option>
                <option value="twilight" ${state.palette === 'twilight' && !state.customPalette ? 'selected' : ''}>Twilight</option>
                <option value="earth" ${state.palette === 'earth' && !state.customPalette ? 'selected' : ''}>Earth</option>
                <option value="mint" ${state.palette === 'mint' && !state.customPalette ? 'selected' : ''}>Mint</option>
                <option value="custom" ${state.customPalette ? 'selected' : ''}>Custom Palette</option>
            </select>
            <button onclick="openCustomPaletteModal()" style="width: 100%; margin-top: 12px;">Create Custom</button>
            <div class="palette-preview" style="margin-top: 16px;">
                ${paletteHTML}
            </div>
        </div>

        <div class="sidebar-section">
            <h3>Current Highlight</h3>
            <div class="current-color-display">
                <div class="current-color-swatch" style="background-color: ${currentColor};"></div>
                <div class="current-color-info">
                    <div class="current-color-label">Active Color</div>
                    <div class="current-color-hex">${currentColor}</div>
                </div>
            </div>
            <button class="primary" onclick="cycleColor()" style="width: 100%;">Next Color</button>
        </div>

        ${highlightCounts && Object.keys(highlightCounts).length > 0 ? `
        <div class="sidebar-section">
            <h3>Highlights Distribution</h3>
            <div class="color-bar-chart">
                ${colorBar}
            </div>
            <div class="color-bar-label">Total: ${state.highlights.reduce((sum, h) => sum + (h.end - h.start), 0)} characters</div>
        </div>
        ` : ''}
    `;
}

function changePalette(palette) {
    if (palette === 'custom') {
        openCustomPaletteModal();
    } else {
        state.palette = palette;
        state.customPalette = null;
        render();
    }
}

function openCustomPaletteModal() {
    const modal = document.getElementById('customPaletteModal');
    modal.classList.add('active');
}

function createCustomPalette() {
    const start = document.getElementById('colorStart').value;
    const middle = document.getElementById('colorMiddle').value;
    const end = document.getElementById('colorEnd').value;
    const steps = parseInt(document.getElementById('colorSteps').value) || 10;

    if (!start || !middle || !end) {
        showStatus('Please select all three colors', 'error');
        return;
    }

    state.customPalette = generateGradient(start, middle, end, steps);
    state.palette = 'custom';
    document.getElementById('customPaletteModal').classList.remove('active');
    render();
    showStatus('Custom palette created');
}

function render() {
    renderEditor();
    renderSidebar();
}

function renderApp() {
    const isShared = !state.editMode;
    const app = document.getElementById('app');

    if (isShared) {
        app.innerHTML = `
            <div class="shared-view">
                <div class="shared-header">
                    <h1>✧ Rhyme Highlighter</h1>
                    <p>Published view</p>
                </div>
                <div class="shared-content" id="sharedContent"></div>
                <div style="text-align: center; margin-top: 40px;">
                    <button class="primary" onclick="exitPreview()">← Back to Edit</button>
                </div>
            </div>
        `;
        renderSharedContent();
    } else {
        app.innerHTML = `
            <div class="header">
                <h1>~Rhymescape~</h1>
                <p>an in progress project for annotating rap lyrics!</p>
            </div>

            <div class="container">
                <div class="editor-section">
                    <div class="editor-wrapper">
                        <div id="editor" contenteditable="true" style="direction: ltr;"></div>
                    </div>
                    <div class="toolbar">
                        <div class="toolbar-group">
                            <button class="primary ${state.highlightMode ? 'active' : ''}" onclick="toggleHighlightMode()">✓ Highlight</button>
                        </div>
                        <div class="toolbar-group">
                            <button onclick="undo()" ${state.historyIndex <= 0 ? 'disabled' : ''}>↶ Undo</button>
                            <button onclick="redo()" ${state.historyIndex >= state.history.length - 1 ? 'disabled' : ''}>↷ Redo</button>
                        </div>
                        <div class="toolbar-group">
                            <button onclick="generateShareableLink()">🔗 Share</button>
                            <button onclick="downloadJSON()">↓ JSON</button>
                            <button onclick="importJSON()">Import</button>
                        </div>
                        <div class="toolbar-group">
                            <button onclick="previewPublished()">👁 Preview</button>
                            <button onclick="clearAll()" class="danger">Clear All</button>
                        </div>
                    </div>

                    <div class="shortcuts-info">
                        <h4>Keyboard Shortcuts</h4>
                        <div class="shortcut-item">
                            <span><span class="shortcut-key">Ctrl+Z</span> Undo</span>
                        </div>
                        <div class="shortcut-item">
                            <span><span class="shortcut-key">Ctrl+Y</span> Redo</span>
                        </div>
                        <div class="shortcut-item">
                            <span><span class="shortcut-key">Right-Click Highlight</span> Next color</span>
                        </div>
                        <div class="shortcut-item">
                            <span><span class="shortcut-key">Double-Click (in mode)</span> Remove highlight</span>
                        </div>
                    </div>
                </div>

                <div class="sidebar" id="sidebar"></div>
            </div>

            <!-- Custom Palette Modal -->
            <div class="modal" id="customPaletteModal">
                <div class="modal-content">
                    <span class="close-modal" onclick="document.getElementById('customPaletteModal').classList.remove('active')">×</span>
                    <h2>Create Custom Palette</h2>
                    <div class="color-picker-group">
                        <label>Start Color (Lightest)</label>
                        <input type="color" id="colorStart" value="#ffffff">
                    </div>
                    <div class="color-picker-group">
                        <label>Middle Color</label>
                        <input type="color" id="colorMiddle" value="#888888">
                    </div>
                    <div class="color-picker-group">
                        <label>End Color (Darkest)</label>
                        <input type="color" id="colorEnd" value="#000000">
                    </div>
                    <div class="color-picker-group">
                        <label>Number of Colors</label>
                        <input type="text" id="colorSteps" value="10" style="font-family: 'JetBrains Mono', monospace;">
                    </div>
                    <div class="gradient-preview" id="gradientPreview"></div>
                    <div class="modal-buttons">
                        <button class="primary" onclick="createCustomPalette()">Create</button>
                        <button onclick="document.getElementById('customPaletteModal').classList.remove('active')">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Import Modal -->
            <div class="modal" id="importModal">
                <div class="modal-content">
                    <span class="close-modal" onclick="document.getElementById('importModal').classList.remove('active')">×</span>
                    <h2>Import from JSON</h2>
                    <div class="modal-section">
                        <label>Paste your JSON file contents:</label>
                        <input type="text" id="importText" placeholder="Paste JSON here..." style="min-height: 100px; padding: 12px;">
                    </div>
                    <div class="modal-buttons">
                        <button class="primary" onclick="processImportJSON()">Import</button>
                        <button onclick="document.getElementById('importModal').classList.remove('active')">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Share Modal -->
            <div class="modal" id="shareModal">
                <div class="modal-content">
                    <span class="close-modal" onclick="document.getElementById('shareModal').classList.remove('active')">×</span>
                    <h2>Shareable Link</h2>
                    <div class="modal-section">
                        <label>Share this link:</label>
                        <input type="text" id="shareLink" readonly>
                    </div>
                    <div class="modal-buttons">
                        <button class="primary" onclick="copyToClipboard('shareLink')">Copy Link</button>
                        <button onclick="document.getElementById('shareModal').classList.remove('active')">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        const editor = document.getElementById('editor');
        editor.addEventListener('input', (e) => {
            // state.text = e.target.textContent;
            // state.text = e.target.innerText;
            // state.text = e.target.innerText.replace(/\r\n/g, '\n');
            state.text = e.target.innerText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        });

        editor.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            if (selection.toString().length > 0 && state.highlightMode) {
                const range = selection.getRangeAt(0);
                const preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(editor);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                const end = preCaretRange.toString().length;
                const start = end - selection.toString().length;

                applyHighlight(start, end);
                selection.removeAllRanges();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        });

        render();
    }
}

function renderSharedContent() {
    const content = document.getElementById('sharedContent');
    const text = state.text;

    let html = '';
    const marks = [];
    
    state.highlights.forEach((h, i) => {
        marks.push({ type: 'highlight', start: h.start, end: h.end, data: h, index: i });
    });
    marks.sort((a, b) => a.start - b.start);

    let i = 0;

    while (i < text.length) {
        const overlapping = marks.filter(m => m.start === i);

        if (overlapping.length > 0) {
            const mark = overlapping[0];
            const sliceEnd = mark.end;
            const slice = text.slice(i, sliceEnd);
            const color = getColorForIndex(mark.data.colorIndex);

            html += `<span class="highlight" style="background-color: ${color};">${escapeHtml(slice)}</span>`;

            i = sliceEnd;
        } else {
            html += escapeHtml(text[i]);
            i++;
        }
    }

    content.innerHTML = html;
}

function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    el.select();
    document.execCommand('copy');
    showStatus('Copied to clipboard');
}

document.addEventListener('DOMContentLoaded', () => {
    loadSharedData();
    saveToHistory();
    renderApp();
});

['contextmenu'].forEach(event => {
    document.addEventListener(event, (e) => {
        e.preventDefault();
    }, true);
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    cycleColor();
}, true);