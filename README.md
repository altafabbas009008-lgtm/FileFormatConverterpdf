# PDFLite — Privacy-First Offline Desktop PDF Manager

**PDFLite** is a lightweight, 100% offline desktop application for local PDF management, manipulation, and format conversion built with **Tauri v2**, **React 18**, **TypeScript**, and **Tailwind CSS**.

---

## 🏗️ Architecture & PDF Library Recommendation

### The Hybrid Synergy Pattern: `pdf-lib` + `pdfjs-dist`
Choosing between `pdf-lib` and `PDF.js` is a false dichotomy because they solve fundamentally different problems:

| Capability | `pdf-lib` (Document Manipulation) | `pdfjs-dist` (Document Rasterization) |
| :--- | :--- | :--- |
| **Primary Purpose** | Object-level PDF creation, assembly, and modification | Viewport & canvas rendering / rasterization |
| **Vector Text & Font Quality** | **100% Preserved** (Zero rasterization, stays crisp & searchable) | N/A (converts vector commands to pixels) |
| **Merge, Split, Extract (FR-1, FR-2, FR-6)**|  Native `copyPages()`, ultra-fast | ❌ Unusable (would require rasterizing pages) |
| **Rotate & Delete Pages (FR-4, FR-5)** |  Native `setRotation()`, `removePage()` | ❌ Unusable for saving |
| **Thumbnails & Visual Grid (FR-7)** | ❌ Impossible (no rasterizer/font engine) |  Renders to HTML5 Canvas in ~10ms |
| **PDF to Images JPG/PNG (FR-8)** | ❌ Impossible |  Full DPI control (72, 150, 300 DPI) |
| **Images to PDF (FR-9)** |  Native `embedJpg()` / `embedPng()` | ❌ Not designed for PDF authoring |

### Recommended Decision:
- **Core Operations**: Use **`pdf-lib`** for Merge, Split, Page Extraction, Page Rotation, Deletion, Reordering, and Images-to-PDF.
- **Rendering & Visualization**: Use **`pdfjs-dist`** for rendering thumbnail previews and exporting PDF pages to PNG/JPG.
- **Compression (FR-3)**: Multi-tiered strategy:
  1. *Lossless / Recommended*: Structural compression with `pdf-lib` using `useObjectStreams: true` and stream deflating. Zero text loss, completely safe.
  2. *Extreme*: Compacting streams, removing redundant metadata, and optional raster downsampling for scanned documents.

---

## ⚠️ Critical Trade-Offs & Pitfalls

1. **Memory Management (Large Files)**:
   - `pdf-lib` loads the document into an in-memory `ArrayBuffer`. Holding multiple 200MB+ PDFs in JS memory can strain webview garbage collection.
   - *Mitigation*: We process merge queues iteratively rather than buffering all documents in full simultaneously. For thumbnails, canvas elements are resized to 0x0 and dereferenced immediately.
2. **Text Loss During Compression**:
   - Compressing PDFs by flattening pages into images is an anti-pattern that destroys selectable text, searchability, and OCR. PDFLite isolates structural stream compression so vector text remains crisp.
3. **Corrupted & Password-Protected Files**:
   - `src/utils/fileValidation.ts` inspects `%PDF-` magic headers and the `/Encrypt` dictionary before attempting heavy operations, presenting user-friendly actionable feedback.
4. **Non-Destructive Guarantee**:
   - `src/services/tauri/fsService.ts` checks file existence prior to writing and automatically appends safe version suffixes (e.g., `report_merged (1).pdf`), ensuring original files are never overwritten.

---

## 📁 Repository Structure

```
PDFLite/
├── src-tauri/                 # Tauri v2 Rust Backend & OS Integration
│   ├── Cargo.toml             # Rust dependencies (Tauri, winreg)
│   ├── tauri.conf.json        # Window configuration & desktop plugins
│   ├── capabilities/          # Security capabilities (fs, dialog, opener)
│   │   └── default.json
│   └── src/
│       ├── main.rs            # Desktop executable entry
│       ├── lib.rs             # Tauri setup & command registration
│       └── windows/           # Windows-specific integrations
│           └── context_menu.rs # Windows Explorer right-click registration (FR-13)
├── src/                       # React + TypeScript + Tailwind Frontend
│   ├── components/
│   │   ├── common/            # DropZone (FR-12), ProgressBar, etc.
│   │   ├── layout/            # Sidebar, Header, Navigation
│   │   └── tools/             # MergeTool (FR-1), SplitTool (FR-2/6), CompressTool (FR-3),
│   │                          # OrganizeTool (FR-7), RotateTool (FR-4/5),
│   │                          # PdfToImageTool (FR-8), ImageToPdfTool (FR-9),
│   │                          # ContextMenuModal (FR-13)
│   ├── services/
│   │   ├── pdf/               # pdfLibService, pdfRenderService, pdfCompressService
│   │   └── tauri/             # fsService (non-overwrite guard), dialogService, osIntegration
│   ├── types/                 # Shared TypeScript interfaces (pdf.ts, tools.ts)
│   ├── utils/                 # fileValidation.ts, formatters.ts
│   ├── App.tsx                # Master desktop layout & tool router
│   ├── index.css              # Desktop design tokens & custom scrollbars
│   └── main.tsx               # Application mount
├── package.json               # Node dependencies
├── vite.config.ts             # Vite configuration with Tauri HMR support
└── tailwind.config.js         # Custom branding and colors
```

---

## 🚀 Step-by-Step Setup Guide (Day 1)

### 1. Prerequisites
- **Node.js**: v18+ (v25 installed)
- **Rust & Cargo**: Required for building native Tauri binaries.
  If not already installed:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source $HOME/.cargo/env
  ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server
- **Run in Desktop Mode (Tauri + React)**:
  ```bash
  npm run tauri dev
  ```
- **Run in Browser Mode (Fast UI iteration)**:
  ```bash
  npm run dev
  ```
  *(All PDF features, including Merge, Compress, Split, and Thumbnails, work directly in browser mode via the Web API fallback!)*

### 4. Build Production Executable
```bash
npm run tauri build
```
The compiled, standalone desktop installer will be output to `src-tauri/target/release/bundle/`.
