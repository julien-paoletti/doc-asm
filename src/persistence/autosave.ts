import type { AppState } from '../types.js';
import { serialize, parse } from './file-format.js';

const STORAGE_KEY = 'docasm-autosave';

export function saveToLocalStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

export function loadFromLocalStorage(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const result = parse(raw);
  return result.ok ? result.state : null;
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
