import type { AppState, AppDocument, Section } from '../types.js';
import { getViewer } from '../sections/archie/index.js';

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sectionToHtml(section: Section): string {
  const d = section.data;
  switch (section.type) {
    case 'heading': {
      const level = (d['level'] as string) ?? 'h2';
      const tag = level; // h1, h2, h3
      return `<${tag} class="print-heading">${d['text'] ?? ''}</${tag}>`;
    }
    case 'text':
      return `<div class="print-text">${d['content'] ?? ''}</div>`;
    case 'callout': {
      const variant = d['variant'] as string;
      const title = d['title'] as string;
      const body = d['body'] as string;
      return `<div class="print-callout print-callout--${variant}">
        ${title ? `<div class="print-callout__title">${title}</div>` : ''}
        <div class="print-callout__body">${body}</div>
      </div>`;
    }
    case 'code': {
      const filename = escape(d['filename'] as string ?? '');
      const code = escape(d['code'] as string ?? '');
      const lang = escape(d['language'] as string ?? '');
      return `<div class="print-code">
        ${filename ? `<div class="print-code__filename">${filename}</div>` : ''}
        <pre class="print-code__pre"><code class="language-${lang}">${code}</code></pre>
      </div>`;
    }
    case 'shell': {
      const label = d['label'] as string ?? '';
      const command = escape(d['command'] as string ?? '');
      return `<div class="print-shell">
        ${label ? `<div class="print-shell__label">${label}</div>` : ''}
        <pre class="print-shell__pre"><code>$ ${command}</code></pre>
      </div>`;
    }
    case 'checklist': {
      const items = d['items'] as { text: string; checked: boolean; level?: number }[];
      const rows = items.map((item) => {
        const indent = (item.level ?? 0) * 20;
        const box = item.checked ? '☑' : '☐';
        const cls = item.checked ? ' print-checklist__item--checked' : '';
        return `<div class="print-checklist__item${cls}" style="padding-left:${indent}px">${box} ${escape(item.text)}</div>`;
      }).join('');
      return `<div class="print-checklist">${rows}</div>`;
    }
    case 'keyvalue': {
      const pairs = d['pairs'] as { key: string; value: string }[];
      const rows = pairs.map((p) =>
        `<tr><td class="print-kv__key">${escape(p.key)}</td><td class="print-kv__value">${escape(p.value)}</td></tr>`
      ).join('');
      return `<table class="print-kv"><tbody>${rows}</tbody></table>`;
    }
    case 'link': {
      const items = d['items'] as { url: string }[];
      const links = items.map((i) => `<li><a href="${escape(i.url)}">${escape(i.url)}</a></li>`).join('');
      return `<ul class="print-links">${links}</ul>`;
    }
    case 'separator':
      return (d['style'] as string) === 'blank'
        ? `<div class="print-separator--blank"></div>`
        : `<hr class="print-separator">`;
    case 'image':
      return (d['src'] as string) ? `<img class="print-image" src="${d['src']}" alt="">` : '';
    case 'archie': {
      const viewer = getViewer(section.id);
      return viewer
        ? `<img class="print-image" src="${viewer.exportImage(738)}" alt="Architecture diagram">`
        : `<div class="print-archie">[Architecture diagram — open this file to include it in print]</div>`;
    }
    default:
      return '';
  }
}

function documentToHtml(doc: AppDocument): string {
  const sectionsHtml = doc.sections.map(sectionToHtml).join('\n');
  const status = doc.status ?? 'draft';
  return `<div class="print-document">
    <div class="print-document__header">
      <h1 class="print-document__title">${escape(doc.title) || '<em>Untitled</em>'}</h1>
      <span class="print-document__status print-document__status--${status}">${status}</span>
    </div>
    <div class="print-document__sections">${sectionsHtml}</div>
  </div>`;
}

const PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 24px; }

  .print-document { max-width: 760px; margin: 0 auto 48px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; page-break-inside: avoid; }
  .print-document__header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .print-document__title { font-size: 22px; font-weight: 700; flex: 1; text-align: center; }
  .print-document__status { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 99px; border: 1px solid; }
  .print-document__status--draft   { color: #64748b; border-color: #cbd5e1; }
  .print-document__status--review  { color: #b45309; border-color: #fcd34d; }
  .print-document__status--done    { color: #166534; border-color: #86efac; }

  .print-document__sections > * + * { margin-top: 14px; }

  .print-heading { font-weight: 700; line-height: 1.3; }
  h1.print-heading { font-size: 20px; }
  h2.print-heading { font-size: 17px; }
  h3.print-heading { font-size: 15px; }

  .print-text { line-height: 1.7; }
  .print-text ul, .print-text ol { padding-left: 1.5em; }

  .print-callout { border-radius: 6px; padding: 12px 14px; border-left: 3px solid; }
  .print-callout--info    { background: #eff6ff; border-color: #3b82f6; }
  .print-callout--warning { background: #fffbeb; border-color: #f59e0b; }
  .print-callout--danger  { background: #fff1f2; border-color: #ef4444; }
  .print-callout--tip     { background: #f0fdf4; border-color: #22c55e; }
  .print-callout__title { font-weight: 700; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  .print-callout__body { line-height: 1.6; }

  .print-code, .print-shell { border-radius: 6px; overflow: hidden; }
  .print-code__filename { font-family: monospace; font-size: 11px; background: #1e293b; color: #94a3b8; padding: 5px 12px; }
  .print-code__pre, .print-shell__pre { background: #0f172a; color: #e2e8f0; padding: 14px; font-family: 'Consolas', 'Fira Code', monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  .print-shell__label { font-size: 11px; background: #1e293b; color: #64748b; padding: 4px 12px; }

  .print-checklist { display: flex; flex-direction: column; gap: 5px; }
  .print-checklist__item { line-height: 1.5; }
  .print-checklist__item--checked { color: #94a3b8; text-decoration: line-through; }

  .print-kv { width: 100%; border-collapse: collapse; font-size: 13px; }
  .print-kv td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  .print-kv__key { font-weight: 600; background: #f8fafc; width: 35%; }

  .print-links { padding-left: 1.5em; }
  .print-links a { color: #2563eb; }

  .print-separator { border: none; border-top: 1px solid #e2e8f0; }
  .print-separator--blank { height: 24px; }

  .print-image { max-width: 100%; border-radius: 4px; }
  .print-archie { color: #94a3b8; font-style: italic; font-size: 12px; padding: 16px; text-align: center; border: 1px dashed #e2e8f0; border-radius: 6px; }

  @media print {
    body { padding: 0; }
    .print-document { border: none; padding: 0; margin-bottom: 0; page-break-after: always; }
    .print-document:last-child { page-break-after: avoid; }
    a { color: inherit; text-decoration: none; }
    .print-callout,
    .print-code__filename, .print-code__pre,
    .print-shell__label, .print-shell__pre,
    .print-kv__key {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export function exportPrint(state: AppState): void {
  const documentsHtml = state.documents.map(documentToHtml).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Doc-Asm export</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${documentsHtml}</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();

  win.onload = () => setTimeout(function () {
    win.print();
    win.close();
  }, 100);
}
