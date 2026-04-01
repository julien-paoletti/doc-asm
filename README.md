# Doc-Asm

A technical document assembler. Compose structured documents from heterogeneous content blocks — headings, text, code, shell commands, checklists, key/value tables, callouts, and separators — then export them as `.docasm` files.

## Demo

Available on [GitHub Pages](https://julien-paoletti.github.io/doc-asm/)

## Features

- **Multi-document** — multiple documents per session, reorderable via drag-and-drop
- **8 section types**, each reorderable within its document
- **Save / open** — versioned `.docasm` JSON format, designed for extensibility
- **`Ctrl+S`** keyboard shortcut to save

| Section | Description |
| --- | --- |
| Heading | H1 to H4 |
| Text | Rich paragraph (`contenteditable`) |
| Code block | Editor with language selector and syntax highlighting |
| Shell command | Command block with optional label |
| Checklist | Checkboxes with keyboard navigation |
| Key-value | Key/value table (env vars, API parameters…) |
| Callout | Highlighted block — info, warning, danger, tip |
| Separator | Horizontal line or blank space (S/M/L sizes) |

## Stack

- TypeScript + Vite (no UI framework)
- [Highlight.js](https://highlightjs.org/) for syntax highlighting
- [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop
- [Tabler Icons](https://tabler.io/icons) for icons

## Quick start

```bash
npm install
npm run dev
```

The app is available at `http://localhost:5173`.

## Build

```bash
npm run build   # tsc + vite build → dist/
npm run preview # preview the build
```

## Architecture

```plain
src/
├── components/       # App shell, document editor, section editor
├── dnd/              # SortableJS abstraction
├── persistence/      # .docasm serialization / deserialization
├── sections/         # One folder per section type (plugin + co-located CSS)
│   ├── registry.ts   # Plugin registry
│   ├── callout/
│   ├── checklist/
│   ├── code/
│   ├── heading/
│   ├── keyvalue/
│   ├── separator/
│   ├── shell/
│   └── text/
├── store/            # Reactive state (fine-grained ChangeScope)
├── styles/           # Reset, app globals, editor layout
└── utils/            # ID, clipboard, icons, arrays
```

### Adding a section type

Each section is a plugin implementing `SectionPlugin<TData>`:

```typescript
export const MyPlugin: SectionPlugin<MyData> = {
  typeId: 'my-type',
  label: 'My type',
  icon: icon('myIcon'),
  defaultData: { /* … */ },
  createEditor(data, onChange) {
    const el = document.createElement('div');
    // build the DOM, call onChange({ field }) on every change
    return { el };
  },
};
```

Then register it with `registerPlugin(MyPlugin)` in `src/main.ts`.

## File format (`.docasm`)

```json
{
  "version": 1,
  "documents": [
    {
      "id": "…",
      "title": "My document",
      "sections": [
        { "id": "…", "type": "heading", "data": { "level": "h2", "text": "Introduction" } }
      ]
    }
  ]
}
```

The `data` field is opaque per section type; the `version` field enables future migrations.

## Deployment

The project deploys automatically to GitHub Pages via GitHub Actions on every push to `main`.

> **Prerequisite**: enable Pages in the repository settings → *Source: GitHub Actions*

## License

MIT
