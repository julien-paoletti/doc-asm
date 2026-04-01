import { EditorPane } from './editor-pane.js';
import { icon } from '../utils/icons.js';
import { store } from '../store/store.js';
import { saveFile, openFile } from '../persistence/file-io.js';

let currentFilename = 'untitled.docasm';

export function mountApp(selector: string): void {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`Element "${selector}" not found.`);

  const app = document.createElement('div');
  app.className = 'app';

  // ── Top bar ──────────────────────────────────────────────────────────────
  const topBar = document.createElement('header');
  topBar.className = 'app-topbar';

  const logo = document.createElement('div');
  logo.className = 'app-topbar__logo';
  logo.innerHTML = `${icon('notebook')} Doc-Asm`;

  const topBarActions = document.createElement('div');
  topBarActions.className = 'app-topbar__actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn app-topbar__btn';
  openBtn.innerHTML = `${icon('folderOpen')} Open`;
  openBtn.addEventListener('click', async () => {
    const result = await openFile();
    if (!result) return;
    currentFilename = result.filename;
    store.loadState(result.state);
  });

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary app-topbar__btn';
  saveBtn.innerHTML = `${icon('deviceFloppy')} Save`;
  saveBtn.addEventListener('click', () => {
    saveFile(store.getSnapshot(), currentFilename);
  });

  topBarActions.appendChild(openBtn);
  topBarActions.appendChild(saveBtn);

  topBar.appendChild(logo);
  topBar.appendChild(topBarActions);
  app.appendChild(topBar);

  // ── Ctrl+S shortcut ──────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile(store.getSnapshot(), currentFilename);
    }
  });

  // ── Main workspace ───────────────────────────────────────────────────────
  const workspace = document.createElement('div');
  workspace.className = 'app-workspace';

  const editorPane = new EditorPane();
  workspace.appendChild(editorPane.el);
  app.appendChild(workspace);

  root.appendChild(app);
}
