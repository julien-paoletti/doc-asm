import { EditorPane } from './editor-pane.js';
import { icon } from '../utils/icons.js';
import { store } from '../store/store.js';
import { saveFileAs, writeHandle, openFile } from '../persistence/file-io.js';
import { createEmptyAppState } from '../store/actions.js';
import { saveToLocalStorage, loadFromLocalStorage } from '../persistence/autosave.js';
import { exportMarkdown } from '../export/markdown.js';
import { exportPrint } from '../export/print.js';
import { debounce } from '../utils/debounce.js';
import { showToast } from './toast.js';
import { SearchBar } from './search.js';

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
  const scheduleAutosave = debounce(() => saveToLocalStorage(store.getSnapshot()), 1000);

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

  function makeBtn(
    iconName: Parameters<typeof icon>[0],
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' = 'secondary',
    title?: string,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn--${variant} app-topbar__btn`;
    btn.innerHTML = `${icon(iconName)} ${label}`;
    if (title) btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  const newBtn = makeBtn('fileSpark', 'New', () => {
    fileHandle = null;
    filenameEl.textContent = 'untitled';
    store.loadState(createEmptyAppState());
  });

  const openBtn = makeBtn('folderOpen', 'Open', async () => {
    const result = await openFile();
    if (!result) return;
    fileHandle = result.handle;
    filenameEl.textContent = fileHandle.name;
    store.loadState(result.state);
  });

  const saveBtn = makeBtn('deviceFloppy', 'Save', () => save(), 'primary');

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

  const searchBar = new SearchBar(() => store.getSnapshot());

  const markdownBtn = makeBtn('markdown', 'Markdown', () => exportMarkdown(store.getSnapshot()), 'secondary', 'Export as Markdown');
  const printBtn    = makeBtn('printer',  'Print / PDF', () => exportPrint(store.getSnapshot()),   'secondary', 'Print or export as PDF');

  const topBarSep = document.createElement('div');
  topBarSep.className = 'app-topbar__sep';

  topBarActions.appendChild(themeSelect);
  topBarActions.appendChild(markdownBtn);
  topBarActions.appendChild(printBtn);
  topBarActions.appendChild(topBarSep);
  topBarActions.appendChild(newBtn);
  topBarActions.appendChild(openBtn);
  topBarActions.appendChild(saveBtn);

  topBar.appendChild(logo);
  topBar.appendChild(filenameWrapper);
  topBar.appendChild(topBarActions);
  app.appendChild(topBar);

  // ── Ctrl+S shortcut ──────────────────────────────────────────────────────
  // Registered once per mountApp call; removed if the app element is replaced.
  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchBar.focus();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      store.undo();
      return;
    }
    if (
      ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
    ) {
      e.preventDefault();
      store.redo();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // ── Auto-save ────────────────────────────────────────────────────────────
  const savedState = loadFromLocalStorage();
  if (savedState) store.loadState(savedState);
  store.subscribe(scheduleAutosave);

  // ── Main workspace ───────────────────────────────────────────────────────
  const workspace = document.createElement('div');
  workspace.className = 'app-workspace';

  const editorPane = new EditorPane();
  workspace.appendChild(editorPane.el);
  app.appendChild(workspace);

  app.appendChild(searchBar.el);
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
