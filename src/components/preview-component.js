import { LitElement, html, css, unsafeCSS } from 'lit';

let plantumlRender;
async function loadRenderer() {
    if (!plantumlRender) {
        // Dynamic import resolved relative to the document base URI to handle subdirectory deployments
        const libPath = new URL('./plantuml.js', document.baseURI).href;
        const module = await import(/* @vite-ignore */ libPath);
        plantumlRender = module.renderToString || module.render;
    }
    return plantumlRender;
}

export class PreviewComponent extends LitElement {
    static properties = {
        umlCode: { type: String },
        zoom: { type: Number },
        error: { type: String },
        compiling: { type: Boolean, state: true }
    };

    static styles = css`
        :host {
            container-type: inline-size;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .preview-container {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }

        /* Preview Header Panel */
        .preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 56px;
            padding: 0 16px;
            background: var(--bg-panel-header);
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
            gap: 12px;
        }

        .header-title {
            flex: 1 1 0%;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .zoom-controls {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            gap: 4px;
            background: var(--bg-zoom-controls);
            padding: 3px 6px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            height: 36px;
            box-sizing: border-box;
        }

        .zoom-btn, .zoom-reset-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 0.75rem;
            cursor: pointer;
            width: 20px;
            height: 20px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
        }

        .zoom-btn:hover, .zoom-reset-btn:hover {
            background: var(--bg-glass-active);
            color: var(--text-primary);
        }

        .zoom-btn:active, .zoom-reset-btn:active {
            transform: scale(0.9);
        }

        .zoom-btn:disabled, .zoom-reset-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            background: transparent !important;
            transform: none !important;
        }

        .zoom-value {
            font-family: var(--font-code);
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-primary);
            min-width: 34px;
            text-align: center;
            user-select: none;
        }

        /* Scrollable Canvas Viewport */
        .preview-canvas {
            flex: 1;
            overflow: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 0;
        }

        /* The Diagram Paper */
        .diagram-paper {
            background: var(--bg-paper);
            border-radius: 12px;
            box-shadow: var(--shadow-paper);
            padding: 20px;
            transition: width var(--transition-normal), min-width var(--transition-normal);
            margin-bottom: 20px;
            box-sizing: border-box;
            border: 1px solid rgba(0, 0, 0, 0.06);
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
        }

        .notation-display {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: transparent;
        }

        /* Force rendered SVG to be responsive and fit inside the paper card */
        .notation-display svg {
            max-width: 100%;
            height: auto !important;
            display: block;
        }

        .empty-state {
            color: var(--text-muted);
            font-size: 0.9rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            gap: 12px;
            text-align: center;
        }

        .empty-icon {
            width: 48px;
            height: 48px;
            object-fit: contain;
            opacity: 0.4;
            animation: pulse-slow 3s infinite ease-in-out;
        }

        /* Fatal Error Panel */
        .error-panel {
            background: var(--warning-bg);
            border: 1px solid var(--warning-border);
            border-radius: 10px;
            padding: 12px 16px;
            margin-top: 12px;
            width: 100%;
            max-width: 800px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            flex-shrink: 0;
        }

        .error-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--accent-rose);
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .error-message {
            font-family: var(--font-code);
            font-size: 0.75rem;
            color: var(--warning-text);
            line-height: 1.4;
            padding: 8px;
            background: var(--warning-item-bg);
            border-radius: 4px;
            border-left: 3px solid var(--accent-rose);
            white-space: pre-wrap;
        }

        /* Action Controls Group */
        .header-controls {
            flex: 1 1 0%;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
        }

        /* Action Buttons */
        .action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--midi-btn-bg);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            font-family: var(--font-ui);
            font-size: 1rem;
            font-weight: 600;
            height: 36px;
            width: 36px;
            border-radius: 6px;
            cursor: pointer;
            transition: all var(--transition-fast);
            user-select: none;
            white-space: nowrap;
            box-sizing: border-box;
            flex-shrink: 0;
        }

        .action-btn:hover {
            background: var(--bg-glass-active);
            border-color: var(--border-hover);
            transform: translateY(-1px);
        }

        .action-btn:active {
            transform: translateY(0);
        }

        @media (max-width: 1024px) {
            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }
        }

        @media (max-width: 768px) {
            .preview-canvas {
                padding: 12px;
            }

            .diagram-paper {
                padding: 12px;
            }

            .preview-header {
                height: 48px;
                padding: 0 10px;
                gap: 6px;
            }
        }

        @media (max-width: 480px) {
            .preview-header {
                height: 48px;
                padding: 0 8px;
                gap: 4px;
            }
            .zoom-controls {
                padding: 2px 4px;
                gap: 2px;
                height: 24px;
            }
            .zoom-btn, .zoom-reset-btn {
                width: 14px;
                height: 14px;
                font-size: 0.6rem;
            }
            .zoom-value {
                font-size: 0.7rem;
                min-width: 28px;
            }
            .action-btn {
                height: 24px;
                width: 24px;
            }
            .header-controls {
                gap: 4px;
            }
        }

        /* Container queries for dynamic splitter resizing sensitivity */
        @container (max-width: 680px) {
            .title-text {
                display: none !important;
            }
        }

        @container (max-width: 520px) {
            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.8rem;
            }

            .zoom-controls {
                gap: 4px;
                padding: 2px 4px;
                border-radius: 8px;
                height: 24px;
            }

            .zoom-btn, .zoom-reset-btn {
                width: 14px;
                height: 14px;
                font-size: 0.6rem;
            }

            .zoom-value {
                font-size: 0.7rem;
                min-width: 28px;
            }
        }

        @container (max-width: 380px) {
            .preview-header {
                height: 44px;
                padding: 0 8px;
                gap: 4px;
            }

            .header-controls {
                gap: 4px;
            }

            .action-btn {
                height: 24px;
                width: 24px;
                font-size: 0.75rem;
            }
        }

        .canvas-wrapper {
            position: relative;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
            width: 100%;
        }

        /* Loading Overlay overlayed on preview canvas */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(11, 15, 25, 0.15);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            animation: fadeIn var(--transition-fast);
        }

        .loading-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(139, 92, 246, 0.15);
            border-top: 3px solid var(--accent-violet);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }


        /* Disabled state for expand button when no diagram */
        .action-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
            transform: none !important;
            background: transparent !important;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes pulse-slow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
        }
    `;

    constructor() {
        super();
        this.umlCode = '';
        this.zoom = 1.0;
        this.error = null;
        this.compiling = false;
        this._renderTimeout = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._onThemeChanged = () => {
            this.renderDiagram();
        };
        window.addEventListener('theme-changed', this._onThemeChanged);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('theme-changed', this._onThemeChanged);
        if (this._renderTimeout) {
            clearTimeout(this._renderTimeout);
        }
    }

    updated(changedProperties) {
        if (changedProperties.has('umlCode')) {
            if (this._renderTimeout) {
                clearTimeout(this._renderTimeout);
            }
            this._renderTimeout = setTimeout(() => {
                this.renderDiagram();
            }, 250); // Debounce diagram rendering slightly for typing smoothness
        }

    }

    zoomIn() {
        if (this.zoom < 1.8) {
            this.zoom = parseFloat((this.zoom + 0.1).toFixed(1));
        }
    }

    zoomOut() {
        if (this.zoom > 0.4) {
            this.zoom = parseFloat((this.zoom - 0.1).toFixed(1));
        }
    }

    zoomReset() {
        this.zoom = 1.0;
    }

    openLightbox() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) return;

        const modal = document.createElement('lightbox-modal');
        modal.svgNode = svg;
        document.body.appendChild(modal);
    }

    async renderDiagram() {
        const code = this.umlCode?.trim();
        const displayDiv = this.shadowRoot.querySelector('.notation-display');

        if (!displayDiv) return;

        if (!code) {
            displayDiv.innerHTML = '';
            this.error = null;
            this.compiling = false;
            this.dispatchEvent(new CustomEvent('status-changed', {
                detail: { status: 'Ready', isError: false },
                bubbles: true,
                composed: true
            }));
            return;
        }

        this.compiling = true;
        this.dispatchEvent(new CustomEvent('status-changed', {
            detail: { status: 'Compiling...', isError: false },
            bubbles: true,
            composed: true
        }));

        try {
            const lines = code.split(/\r\n|\r|\n/);
            const render = await loadRenderer();
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';

            render(
                lines,
                (svgString) => {
                    displayDiv.innerHTML = svgString;
                    this.error = null;
                    this.compiling = false;
                    this.dispatchEvent(new CustomEvent('status-changed', {
                        detail: { status: '✓ Diagram Ready', isError: false },
                        bubbles: true,
                        composed: true
                    }));
                },
                (err) => {
                    console.error("PlantUML compile error:", err);
                    this.error = err.message || String(err);
                    this.compiling = false;
                    this.dispatchEvent(new CustomEvent('status-changed', {
                        detail: { status: '✗ Compilation Error', isError: true },
                        bubbles: true,
                        composed: true
                    }));
                },
                { dark: dark }
            );
        } catch (error) {
            console.error("Renderer load error:", error);
            this.error = error.message || String(error);
            this.compiling = false;
            this.dispatchEvent(new CustomEvent('status-changed', {
                detail: { status: '✗ Engine Error', isError: true },
                bubbles: true,
                composed: true
            }));
        }
    }

    handleExportSVG() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) {
            alert('Please create a diagram first!');
            return;
        }

        try {
            // Include namespace if missing
            const clone = svg.cloneNode(true);
            if (clone.getAttribute("xmlns") == null) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            const svgString = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'diagram.svg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to export SVG: ' + error.message);
        }
    }

    handleCopySVG() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) {
            alert('Please create a diagram first!');
            return;
        }

        try {
            const clone = svg.cloneNode(true);
            if (clone.getAttribute("xmlns") == null) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            const svgString = new XMLSerializer().serializeToString(clone);
            navigator.clipboard.writeText(svgString).then(() => {
                alert('✓ SVG code copied to clipboard!');
            }).catch(err => {
                console.error("Clipboard API failed, trying fallback:", err);
                const textarea = document.createElement('textarea');
                textarea.value = svgString;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('✓ SVG code copied to clipboard!');
            });
        } catch (error) {
            alert('Failed to copy SVG: ' + error.message);
        }
    }

    async handleCopyPNG() {
        const svg = this.shadowRoot.querySelector('.notation-display svg');
        if (!svg) {
            alert('Please create a diagram first!');
            return;
        }

        try {
            const clone = svg.cloneNode(true);
            if (clone.getAttribute("xmlns") == null) {
                clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            }
            const svgString = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const rect = svg.getBoundingClientRect();
            const width = rect.width || svg.viewBox.baseVal.width || 600;
            const height = rect.height || svg.viewBox.baseVal.height || 400;
            const ratio = window.devicePixelRatio || 2; // high-dpi copy

            const img = new Image();
            img.width = width;
            img.height = height;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = url;
            });

            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(width * ratio);
            canvas.height = Math.ceil(height * ratio);
            const ctx = canvas.getContext("2d");

            // Match background theme color or default white
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.fillStyle = dark ? "#131a2c" : "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.scale(ratio, ratio);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => b == null ? reject(new Error("toBlob failed")) : resolve(b), "image/png");
            });

            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob })
            ]);

            alert('✓ PNG Image copied to clipboard!');
        } catch (err) {
            console.error("Copy PNG failed:", err);
            alert('Failed to copy PNG: ' + err.message);
        }
    }

    render() {
        const hasCode = this.umlCode?.trim().length > 0;
        const paperWidthPercent = Math.round(this.zoom * 100);

        return html`
            <div class="preview-container">
                <div class="preview-header">
                    <div class="header-title">
                        📊 <span class="title-text">Diagram Preview</span>
                    </div>
                    
                    <div class="zoom-controls">
                        <button class="zoom-btn" @click="${this.zoomOut}" ?disabled="${this.zoom <= 0.4}" title="Zoom Out">-</button>
                        <span class="zoom-value">${paperWidthPercent}%</span>
                        <button class="zoom-btn" @click="${this.zoomIn}" ?disabled="${this.zoom >= 1.8}" title="Zoom In">+</button>
                        <button class="zoom-reset-btn" @click="${this.zoomReset}" ?disabled="${this.zoom === 1.0}" title="Reset Zoom">
                            ↺
                        </button>
                    </div>

                    <div class="header-controls">
                        <button class="action-btn" @click="${this.openLightbox}" ?disabled="${!hasCode}" title="View diagram fullscreen">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;pointer-events:none">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="action-btn" @click="${this.handleExportSVG}" title="Download diagram as SVG">
                            📥
                        </button>
                        <button class="action-btn" @click="${this.handleCopySVG}" title="Copy raw SVG to clipboard">
                            📋
                        </button>
                        <button class="action-btn" @click="${this.handleCopyPNG}" title="Copy diagram as PNG bitmap image">
                            🖼️
                        </button>
                    </div>
                </div>

                <div class="canvas-wrapper">
                    <div class="preview-canvas">
                        ${!hasCode ? html`
                            <div class="empty-state">
                                <img class="empty-icon" src="./favicon.svg" alt="PlantUML Logo" />
                                <p>PlantEditor is ready.<br>Type PlantUML code or choose a Template to begin.</p>
                            </div>
                        ` : html`
                            <div class="diagram-paper" style="${`width: ${paperWidthPercent}%; min-width: ${paperWidthPercent}%;`}">
                                <div class="notation-display"></div>
                            </div>
                        `}

                        ${this.error ? html`
                            <div class="error-panel">
                                <div class="error-header">
                                    ❌ Execution Exception
                                </div>
                                <div class="error-message">${this.error}</div>
                            </div>
                        ` : ''}
                    </div>

                    ${this.compiling ? html`
                        <div class="loading-overlay">
                            <div class="loading-spinner"></div>
                        </div>
                    ` : ''}
                </div>

            </div>
        `;
    }
}
