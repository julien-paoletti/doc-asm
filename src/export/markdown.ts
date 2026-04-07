import type { AppState, AppDocument, Section } from '../types.js';

function htmlToText(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent ?? '';
}

function htmlToMarkdown(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return nodeToMarkdown(el).trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';

  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  const children = Array.from(el.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'b': case 'strong': return `**${children}**`;
    case 'i': case 'em':     return `_${children}_`;
    case 'u':                return `<u>${children}</u>`;
    case 's': case 'strike': return `~~${children}~~`;
    case 'br':               return '\n';
    case 'p':                return `${children}\n\n`;
    case 'ul':               return el.querySelectorAll(':scope > li').length
      ? Array.from(el.querySelectorAll(':scope > li')).map((li) => `- ${nodeToMarkdown(li).trim()}`).join('\n') + '\n\n'
      : children;
    case 'ol':               return Array.from(el.querySelectorAll(':scope > li')).map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`).join('\n') + '\n\n';
    case 'li':               return children;
    case 'div':              return children ? `${children}\n` : '';
    default:                 return children;
  }
}

function sectionToMarkdown(section: Section): string {
  const d = section.data;
  switch (section.type) {
    case 'heading': {
      const level = (d['level'] as string) ?? 'h2';
      const hashes = level === 'h1' ? '#' : level === 'h2' ? '##' : '###';
      return `${hashes} ${htmlToText(d['text'] as string ?? '')}\n\n`;
    }
    case 'text':
      return `${htmlToMarkdown(d['content'] as string ?? '')}\n`;
    case 'callout': {
      const variant = (d['variant'] as string).toUpperCase();
      const title = htmlToText(d['title'] as string ?? '');
      const body = htmlToMarkdown(d['body'] as string ?? '');
      const header = title ? `**${variant}: ${title}**` : `**${variant}**`;
      return `> ${header}\n>\n${body.split('\n').filter(Boolean).map((l) => `> ${l}`).join('\n')}\n\n`;
    }
    case 'code': {
      const lang = (d['language'] as string) ?? '';
      const filename = (d['filename'] as string) ?? '';
      const code = (d['code'] as string) ?? '';
      const header = filename ? `\`${filename}\`\n` : '';
      return `${header}\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }
    case 'shell': {
      const label = htmlToText(d['label'] as string ?? '');
      const command = htmlToText(d['command'] as string ?? '');
      const header = label ? `${label}\n` : '';
      return `${header}\`\`\`sh\n${command}\n\`\`\`\n\n`;
    }
    case 'checklist': {
      const items = d['items'] as { text: string; checked: boolean; level?: number }[];
      return items.map((item) => {
        const indent = '  '.repeat(item.level ?? 0);
        const box = item.checked ? '[x]' : '[ ]';
        return `${indent}- ${box} ${item.text}`;
      }).join('\n') + '\n\n';
    }
    case 'keyvalue': {
      const pairs = d['pairs'] as { key: string; value: string }[];
      const rows = pairs.map((p) => `| ${p.key} | ${p.value} |`).join('\n');
      return `| Key | Value |\n|-----|-------|\n${rows}\n\n`;
    }
    case 'link': {
      const items = d['items'] as { url: string }[];
      return items.map((i) => `- ${i.url}`).join('\n') + '\n\n';
    }
    case 'separator':
      return (d['style'] as string) === 'blank' ? '\n' : '---\n\n';
    case 'image':
      return (d['src'] as string) ? `![image](${d['src']})\n\n` : '';
    case 'archie':
      return `_[Architecture diagram]_\n\n`;
    default:
      return '';
  }
}

function documentToMarkdown(doc: AppDocument): string {
  const parts: string[] = [];
  if (doc.title) parts.push(`# ${doc.title}\n\n`);
  for (const section of doc.sections) {
    parts.push(sectionToMarkdown(section));
  }
  return parts.join('');
}

export function exportMarkdown(state: AppState): void {
  const md = state.documents.map(documentToMarkdown).join('\n---\n\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.md';
  a.click();
  URL.revokeObjectURL(url);
}
