import { EditorPane } from './editor-pane.js';
import { icon } from '../utils/icons.js';
import { store } from '../store/store.js';
import { saveFileAs, writeHandle, openFile } from '../persistence/file-io.js';
import { showToast } from './toast.js';

const THEMES = [
  { id: 'default',  label: 'Blue'     },
  { id: 'midnight', label: 'Midnight' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'storm',    label: 'Storm'    },
  { id: 'amber',    label: 'Amber'    },
  { id: 'rose',     label: 'Rosé'     },
] as const;

type ThemeId = typeof THEMES[number]['id'];

function applyTheme(id: ThemeId): void {
  document.documentElement.dataset['theme'] = id === 'default' ? '' : id;
  localStorage.setItem('docasm-theme', id);
}

export function mountApp(selector: string): void {
  const root = document.querySelector(selector);
  if (!root) throw new Error(`Element "${selector}" not found.`);

  // Restore persisted theme
  const savedTheme = (localStorage.getItem('docasm-theme') ?? 'default') as ThemeId;
  applyTheme(savedTheme);

  let fileHandle: FileSystemFileHandle | null = null;

  const app = document.createElement('div');
  app.className = 'app';

  // ── Top bar ──────────────────────────────────────────────────────────────
  const topBar = document.createElement('header');
  topBar.className = 'app-topbar';

  const logo = document.createElement('div');
  logo.className = 'app-topbar__logo';
  logo.innerHTML = `${icon('notebook')} Doc-Asm <span class="app-topbar__tagline">Document assembly for developers</span>`;

  const filenameWrapper = document.createElement('div');
  filenameWrapper.className = 'app-topbar__filename-wrapper';
  filenameWrapper.innerHTML = icon('fileText');

  const filenameEl = document.createElement('span');
  filenameEl.className = 'app-topbar__filename';
  filenameEl.textContent = 'untitled';
  filenameWrapper.appendChild(filenameEl);

  const topBarActions = document.createElement('div');
  topBarActions.className = 'app-topbar__actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'btn btn--secondary app-topbar__btn';
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

  const themeSelect = document.createElement('select');
  themeSelect.className = 'app-topbar__theme-select';
  themeSelect.title = 'Theme';
  THEMES.forEach(({ id, label }) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = label;
    opt.selected = id === savedTheme;
    themeSelect.appendChild(opt);
  });
  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value as ThemeId));

  topBarActions.appendChild(themeSelect);
  topBarActions.appendChild(openBtn);
  topBarActions.appendChild(saveBtn);

  topBar.appendChild(logo);
  topBar.appendChild(filenameWrapper);
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
    try {
      if (fileHandle) {
        await writeHandle(fileHandle, store.getSnapshot());
      } else {
        const handle = await saveFileAs(store.getSnapshot());
        if (!handle) return;
        fileHandle = handle;
        filenameEl.textContent = fileHandle.name;
      }
      showToast({ message: `Saved — ${fileHandle!.name}`, variant: 'success' });
    } catch {
      showToast({ message: 'Failed to save file.', variant: 'error' });
    }
  }
}
