import { EditorPane } from './editor-pane.js';
import { icon } from '../utils/icons.js';
import { store } from '../store/store.js';
import { saveFileAs, writeHandle, openFile } from '../persistence/file-io.js';

export function mountApp(selector: string): void {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`Element "${selector}" not found.`);

  let fileHandle: FileSystemFileHandle | null = null;

  const app = document.createElement('div');
  app.className = 'app';

  // ── Top bar ──────────────────────────────────────────────────────────────
  const topBar = document.createElement('header');
  topBar.className = 'app-topbar';

  const logo = document.createElement('div');
  logo.className = 'app-topbar__logo';
  logo.innerHTML = `${icon('notebook')} Doc-Asm`;

  const filenameEl = document.createElement('span');
  filenameEl.className = 'app-topbar__filename';
  filenameEl.textContent = 'untitled';

  const topBarActions = document.createElement('div');
  topBarActions.className = 'app-topbar__actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn app-topbar__btn';
  openBtn.innerHTML = `${icon('folderOpen')} Open`;
  openBtn.addEventListener('click', async () => {
    const result = await openFile();
    if (!result) return;
    fileHandle = result.handle;
    filenameEl.textContent = fileHandle.name;
    store.loadState(result.state);
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary app-topbar__btn';
  saveBtn.innerHTML = `${icon('deviceFloppy')} Save`;
  saveBtn.addEventListener('click', () => save());

  topBarActions.appendChild(openBtn);
  topBarActions.appendChild(saveBtn);

  topBar.appendChild(logo);
  topBar.appendChild(filenameEl);
  topBar.appendChild(topBarActions);
  app.appendChild(topBar);

  // ── Ctrl+S shortcut ──────────────────────────────────────────────────────
  // Registered once per mountApp call; removed if the app element is replaced.
  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // ── Main workspace ───────────────────────────────────────────────────────
  const workspace = document.createElement('div');
  workspace.className = 'app-workspace';

  const editorPane = new EditorPane();
  workspace.appendChild(editorPane.el);
  app.appendChild(workspace);

  root.appendChild(app);

  async function save(): Promise<void> {
    if (fileHandle) {
      await writeHandle(fileHandle, store.getSnapshot());
    } else {
      const handle = await saveFileAs(store.getSnapshot());
      if (!handle) return;
      fileHandle = handle;
      filenameEl.textContent = fileHandle.name;
    }
  }
}
