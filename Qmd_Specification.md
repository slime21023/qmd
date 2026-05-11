# Qmd — Project Specification

> **Version**: v1.0.0-draft  
> **Date**: 2026-05-11  
> **Tech Stack**: Bun · Vite · TypeScript · Svelte  

---

## 1. Project Overview

### 1.1 Goal

**Qmd** (Quick Markdown Viewer) is a locally-run CLI tool that scans a specified directory for Markdown files and launches a lightweight HTTP server, providing a web interface for users to browse and read those documents.

### 1.2 Use Cases

- Developers previewing project documentation locally
- Technical writers organizing and reading large collections of Markdown notes
- Teams quickly reviewing internal documentation on a local machine

### 1.3 Out of Scope

- No online deployment or multi-user collaboration
- No Markdown editing or file saving
- No user authentication or access control

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | **Bun** | CLI execution, HTTP server, file system operations |
| Build Tool | **Vite** | Frontend asset bundling (SPA) |
| Language | **TypeScript** | Full-stack type safety |
| Frontend Framework | **Svelte 5** | Web UI |
| Markdown Parsing | **marked** + **highlight.js** | MD rendering and code syntax highlighting |
| Styling | **CSS Variables** / Tailwind CSS | Themeable style system |
| CLI Argument Parsing | **citty** or Bun native `argv` | CLI argument handling |

---

## 3. Project Structure

```
qmd/
├── package.json
├── bunfig.toml
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── cli/                        # CLI entry point and backend logic
│   │   ├── index.ts                # CLI main entry (bin)
│   │   ├── args.ts                 # CLI argument definitions and parsing
│   │   ├── scanner.ts              # Directory scanning and file tree construction
│   │   ├── server.ts               # Bun HTTP Server
│   │   └── router.ts               # API route handlers
│   │
│   └── ui/                         # Frontend Svelte SPA
│       ├── main.ts                 # Svelte mount entry
│       ├── App.svelte              # Root component
│       ├── components/
│       │   ├── Sidebar.svelte      # Sidebar (file tree panel)
│       │   ├── FileTree.svelte     # Tree-structured file list component
│       │   ├── FileTreeNode.svelte # Single tree node (recursive)
│       │   ├── MarkdownView.svelte # Markdown rendering area
│       │   ├── SearchBar.svelte    # Search input component
│       │   └── ThemeToggle.svelte  # Light/dark mode toggle
│       ├── stores/
│       │   ├── fileTree.ts         # File tree state
│       │   └── currentFile.ts      # Currently selected file state
│       ├── types/
│       │   └── index.ts            # Shared type definitions
│       └── styles/
│           ├── global.css
│           └── variables.css       # CSS theme variables
│
├── dist/                           # Vite build output (embedded into server)
└── bin/
    └── qmd                         # Compiled executable (bun build output)
```

---

## 4. CLI Specification

### 4.1 Command Syntax

```bash
qmd [directory] [options]
```

### 4.2 Arguments & Options

| Argument | Alias | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `[dir]` | — | `string` | `.` (current directory) | Target directory to scan |
| `--port` | `-p` | `number` | `3000` | HTTP server listening port |
| `--no-open` | — | `boolean` | `false` | Do not auto-open browser on start |
| `--depth` | `-d` | `number` | `Infinity` | Maximum recursive scan depth |
| `--ignore` | `-i` | `string[]` | `['node_modules', '.git']` | Glob patterns for directories/files to ignore |
| `--version` | `-v` | — | — | Display version number |
| `--help` | `-h` | — | — | Display help information |

### 4.3 Usage Examples

```bash
# Scan current directory, start on port 3000
qmd

# Scan the ./docs directory
qmd ./docs

# Custom port, do not auto-open browser
qmd ./docs --port 8080 --no-open

# Limit scan depth to 2 levels, ignore the drafts folder
qmd ./notes --depth 2 --ignore drafts
```

### 4.4 Startup Flow

```
1. Parse CLI arguments
2. Validate that the target path exists and is a directory
3. Recursively scan the directory and build the FileTree
4. Load frontend SPA static assets into memory (embedded in executable)
5. Start Bun HTTP Server
6. Print startup message to stdout
7. Unless --no-open is set, invoke system command to open browser
```

### 4.5 stdout Output Format

```
✦ Qmd — Quick Markdown Viewer
─────────────────────────────────
📁 Directory : /Users/user/docs
📄 Found     : 12 Markdown files
🌐 Server    : http://localhost:3000
─────────────────────────────────
Press Ctrl+C to stop
```

---

## 5. HTTP Server Specification

### 5.1 Server Info

- **Runtime**: Bun native `Bun.serve()`
- **Default Port**: `3000` (overridable via CLI)
- **Host**: `127.0.0.1` (local only, not exposed externally)

### 5.2 API Endpoints

#### `GET /api/files`

Returns the complete file tree structure as JSON.

**Response**
```json
{
  "root": "/Users/user/docs",
  "tree": {
    "name": "docs",
    "type": "directory",
    "path": "/",
    "children": [
      {
        "name": "README.md",
        "type": "file",
        "path": "/README.md",
        "size": 1024,
        "modifiedAt": "2026-05-10T10:00:00Z"
      },
      {
        "name": "guides",
        "type": "directory",
        "path": "/guides",
        "children": [
          {
            "name": "quickstart.md",
            "type": "file",
            "path": "/guides/quickstart.md",
            "size": 2048,
            "modifiedAt": "2026-05-09T08:30:00Z"
          }
        ]
      }
    ]
  }
}
```

---

#### `GET /api/file?path={filePath}`

Returns the raw content of a specified Markdown file.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | ✅ | File path relative to the scanned root directory |

**Response (success)**
```json
{
  "path": "/guides/quickstart.md",
  "name": "quickstart.md",
  "content": "# Quick Start\n\n...",
  "size": 2048,
  "modifiedAt": "2026-05-09T08:30:00Z"
}
```

**Response (error)**
```json
{
  "error": "FILE_NOT_FOUND",
  "message": "The specified file could not be found."
}
```

> **Security**: The server must validate the `path` parameter to prevent Path Traversal attacks (disallow `../` escaping the root directory).

---

#### `GET /api/search?q={keyword}`

Search files by filename (full-text search not included).

**Response**
```json
{
  "query": "quick",
  "results": [
    {
      "name": "quickstart.md",
      "path": "/guides/quickstart.md"
    }
  ]
}
```

---

#### `GET /*` (Static Assets)

Serves the frontend SPA static assets (HTML, JS, CSS). All routes not prefixed with `/api/` return `index.html` (SPA fallback).

---

## 6. Frontend Specification

### 6.1 Layout

```
┌──────────────────────────────────────────────────┐
│  ✦ Qmd   🔍 SearchBar              [☀️/🌙 Toggle] │  ← Header
├───────────────┬──────────────────────────────────┤
│               │                                  │
│  FileTree     │   MarkdownView                   │
│  (Sidebar)    │   (Main reading area)            │
│               │                                  │
│  📁 docs      │  # Heading                       │
│  ├ README.md  │  Rendered content...             │
│  └ 📁 guides  │                                  │
│    └ qs.md    │                                  │
│               │                                  │
└───────────────┴──────────────────────────────────┘
```

- **Sidebar width**: Fixed `280px`, resizable via drag
- **Responsive**: On screens narrower than `768px`, the sidebar collapses into a Drawer

### 6.2 Component Specification

#### `App.svelte`
- Root application component
- Initializes on mount: calls `/api/files` to fetch the file tree
- Manages global layout state (sidebar expanded/collapsed)

#### `Sidebar.svelte`
- Contains `SearchBar` and `FileTree`
- Displays the scanned root directory name at the top

#### `FileTree.svelte` / `FileTreeNode.svelte`
- Recursively renders the tree structure
- Directory nodes: clickable to expand/collapse; first level expanded by default
- File nodes: clicking loads the corresponding Markdown content
- Currently selected file is highlighted

#### `MarkdownView.svelte`
- Fetches raw Markdown via `/api/file?path=xxx`
- Parses content to HTML using `marked`
- Applies syntax highlighting to code blocks using `highlight.js`
- Sanitizes rendered HTML with `DOMPurify` before injection (XSS protection)
- Displays filename and last modified time in the header area
- Auto-generates heading anchor links (`#heading-id`)

#### `SearchBar.svelte`
- Filters the FileTree by filename in real time (debounce 300ms)
- Shows an empty state message when no results are found
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` to focus the search input

#### `ThemeToggle.svelte`
- Toggles between light and dark themes
- Theme preference persisted in `localStorage`
- Defaults to system theme (`prefers-color-scheme`)

### 6.3 State Management (Svelte Stores)

```typescript
// stores/fileTree.ts
interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

const fileTree = writable<FileNode | null>(null);
const searchQuery = writable<string>('');
const filteredTree = derived([fileTree, searchQuery], ...);

// stores/currentFile.ts
interface CurrentFile {
  path: string;
  name: string;
  content: string;
  isLoading: boolean;
  error: string | null;
}

const currentFile = writable<CurrentFile | null>(null);
```

### 6.4 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus search bar |
| `Escape` | Clear search / close Drawer |
| `[` / `]` | Navigate to previous / next file |
| `Ctrl+\` | Toggle sidebar expand/collapse |

---

## 7. Build & Packaging

### 7.1 Development Mode

```bash
# Start both Vite dev server (frontend) and Bun CLI server (backend) concurrently
bun run dev
```

- Frontend Vite dev server runs on `localhost:5173`
- Backend Bun server runs on `localhost:3000`
- Vite configured with proxy: `/api/*` → `localhost:3000`

### 7.2 Production Build

```bash
# 1. Vite builds the frontend SPA → dist/
# 2. Bun build compiles CLI + embeds dist/ into a single executable
bun run build
```

**Packaging strategy**: Uses Bun's `--compile` flag to embed frontend static assets into the executable, producing a **zero-dependency single binary** for distribution.

### 7.3 `package.json` Scripts

```json
{
  "name": "qmd",
  "version": "1.0.0",
  "description": "Qmd — Quick Markdown Viewer, a local Markdown browsing CLI tool",
  "scripts": {
    "dev": "concurrently \"vite\" \"bun run src/cli/index.ts ./demo-docs\"",
    "build:ui": "vite build",
    "build:cli": "bun build src/cli/index.ts --compile --outfile bin/qmd",
    "build": "bun run build:ui && bun run build:cli",
    "lint": "tsc --noEmit",
    "test": "bun test"
  },
  "bin": {
    "qmd": "./bin/qmd"
  }
}
```

---

## 8. Type Definitions

```typescript
// src/ui/types/index.ts

/** File tree node */
export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;           // Path relative to the scanned root
  size?: number;          // Bytes; file nodes only
  modifiedAt?: string;    // ISO 8601
  children?: FileNode[];  // Directory nodes only
}

/** /api/files response */
export interface FilesResponse {
  root: string;
  tree: FileNode;
}

/** /api/file response */
export interface FileResponse {
  path: string;
  name: string;
  content: string;
  size: number;
  modifiedAt: string;
}

/** /api/search response */
export interface SearchResponse {
  query: string;
  results: Pick<FileNode, 'name' | 'path'>[];
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
}

/** CLI arguments */
export interface CliArgs {
  dir: string;
  port: number;
  open: boolean;
  depth: number;
  ignore: string[];
}
```

---

## 9. Security Considerations

| Risk | Mitigation |
|------|------------|
| Path Traversal | All `path` parameters must be validated with `resolve()` to ensure they remain within the root directory |
| XSS | All HTML rendered from Markdown must be sanitized with `DOMPurify` before injection |
| External Exposure | Server binds only to `127.0.0.1`; never listens on `0.0.0.0` |
| Arbitrary File Read | Only files with the `.md` extension are permitted to be read |

---

## 10. Roadmap

| Priority | Feature |
|----------|---------|
| P1 | Live file reload on change (`fs.watch` + WebSocket) |
| P1 | Mermaid diagram rendering support |
| P2 | Full-text search (search within MD content, not just filenames) |
| P2 | YAML Front Matter parsing and display |
| P3 | Export entire document set as a static HTML site |
| P3 | Custom theming (CSS variable overrides) |
| P3 | Print / PDF export |