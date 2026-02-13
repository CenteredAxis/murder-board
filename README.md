# Link Analysis Board

An interactive link analysis and relationship visualization tool for investigators, analysts, and intelligence professionals. Build visual investigation boards to map entities, connections, and patterns — with optional AI-powered entity extraction from unstructured text.

## Features

- **Graph Visualization** — Cytoscape.js-powered interactive canvas with force-directed layout, context menus, neighborhood highlighting, and zoom controls
- **Entity Types** — Person, Organization, Phone, Event — each with distinct shapes and colors
- **Relationship Mapping** — Financial, Personal, Professional, Criminal, Communication, Family edges with confidence levels and directional support
- **AI Entity Extraction** — Paste articles, case notes, or intelligence reports and let an LLM automatically extract entities and relationships into the graph
- **Network Analysis** — Degree, closeness, and betweenness centrality calculations with visual scaling
- **Search & Filter** — Full-text search across node labels
- **Data Persistence** — Auto-saves to localStorage; export/import as JSON or PNG
- **Kumu Import** — Supports importing graphs from Kumu JSON format
- **Dark Theme** — Purpose-built dark UI for extended analysis sessions

## Tech Stack

- React 19 + Vite 7
- Cytoscape.js (fcose layout, cxtmenu)
- Tailwind CSS 4
- OpenAI-compatible API (Ollama, or any cloud provider)

## Getting Started

### Prerequisites

- Node.js 18+
- (Optional) [Ollama](https://ollama.ai) for local AI extraction

### Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with a proxy to Ollama at `localhost:11434`.

### Production Build

```bash
npm run build
npm run preview
```

### Docker

```bash
docker build -t link-analysis .
docker run -p 3000:3000 -v link-analysis-uploads:/app/server/uploads link-analysis
```

## AI Entity Extraction

The AI extraction feature sends pasted text to an OpenAI-compatible endpoint and parses the structured response into graph nodes and edges.

1. Click the AI extraction button
2. Paste unstructured text (up to 50,000 characters)
3. Review proposed entities and relationships
4. Accept or reject individual items before committing to the graph

### AI Configuration

Configure via the settings panel in the extraction modal:

| Setting | Default |
|---------|---------|
| Provider | Ollama |
| Endpoint | `/ollama/v1/chat/completions` |
| Model | `gpt-oss:120b` |
| Temperature | 0.1 |
| Max Tokens | 8192 |

Supports any OpenAI-compatible API — set an API key for cloud providers.

## Project Structure

```
src/
├── ai/                  # AI service, prompts, response parsing
├── components/
│   ├── ai/              # Extraction modal & settings panel
│   ├── canvas/          # Graph canvas & overlay controls
│   ├── panels/          # Node/edge detail views & edit forms
│   └── sidebar/         # Node/edge forms, lists, legend
├── hooks/               # Cytoscape, AI extraction, analysis hooks
├── constants.js         # Enums, color maps, defaults
├── storage.js           # localStorage, export/import
├── cytoscape-styles.js  # Graph visual styling
└── kumu-import.js       # Kumu format conversion
```

## License

ISC
