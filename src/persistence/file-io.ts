import { serialize, parse, FILE_EXTENSION, FILE_MIME } from './file-format.js';
import type { AppState } from '../types.js';

const PICKER_OPTS: FilePickerOptions = {
  types: [{
    description: 'Doc-Asm file',
    accept: { [FILE_MIME]: [FILE_EXTENSION as `.${string}`] },
  }],
  excludeAcceptAllOption: true,
};

export async function saveFileAs(state: AppState): Promise<FileSystemFileHandle | null> {
  let handle: FileSystemFileHandle;
  try {
    handle = await window.showSaveFilePicker({
      ...PICKER_OPTS,
      suggestedName: 'untitled' + FILE_EXTENSION,
    });
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') throw e;
    return null;
  }
  await writeHandle(handle, state);
  return handle;
}

export async function openFile(): Promise<{ state: AppState; handle: FileSystemFileHandle } | null> {
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({ ...PICKER_OPTS, multiple: false });
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') throw e;
    return null;
  }

  const handle = handles[0]!;
  const file = await handle.getFile();
  const raw = await file.text();
  const result = parse(raw);
  if (!result.ok) {
    alert(`Failed to open file: ${result.error}`);
    return null;
  }
  return { state: result.state, handle };
}

export async function writeHandle(handle: FileSystemFileHandle, state: AppState): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(serialize(state));
  await writable.close();
}
