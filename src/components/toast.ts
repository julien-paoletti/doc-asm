export type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast({ message, variant = 'info', duration = 3000 }: ToastOptions): void {
  const el = document.createElement('div');
  el.className = `toast toast--${variant}`;
  el.textContent = message;

  const c = getContainer();
  c.appendChild(el);

  // Trigger enter animation
  requestAnimationFrame(() => el.classList.add('toast--visible'));

  const remove = () => {
    el.classList.remove('toast--visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  setTimeout(remove, duration);
}
