import { serialize, parse, FILE_EXTENSION, FILE_MIME } from './file-format.js';
import type { AppState } from '../types.js';

export function saveFile(state: AppState, filename: string): void {
  const json = serialize(state);
  const blob = new Blob([json], { type: FILE_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith(FILE_EXTENSION) ? filename : filename + FILE_EXTENSION;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke to let the browser start the download before the URL is invalidated
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function openFile(): Promise<{ state: AppState; filename: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILE_EXTENSION + ',' + FILE_MIME;

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      const reader = new FileReader();
      reader.onload = () => {
        const result = parse(reader.result as string);
        if (!result.ok) {
          alert(`Failed to open file: ${result.error}`);
          resolve(null);
          return;
        }
        resolve({ state: result.state, filename: file.name });
      };
      reader.readAsText(file);
    });

    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
