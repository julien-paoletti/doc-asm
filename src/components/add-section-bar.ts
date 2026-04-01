import { getAllPlugins, onRegistryChange } from '../sections/registry.js';
import { store } from '../store/store.js';

export class AddSectionBar {
  readonly el: HTMLElement;
  private documentId: string;
  private unsubscribe: () => void;

  constructor(documentId: string) {
    this.documentId = documentId;
    this.el = document.createElement('div');
    this.el.className = 'add-section-bar';

    this.render();
    this.unsubscribe = onRegistryChange(() => this.render());
  }

  private render(): void {
    this.el.innerHTML = '';
    getAllPlugins().forEach((plugin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'add-section-bar__btn';
      btn.title = plugin.label;
      btn.innerHTML = plugin.icon;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        store.addSection(this.documentId, plugin);
      });
      this.el.appendChild(btn);
    });
  }

  destroy(): void {
    this.unsubscribe();
    this.el.remove();
  }
}
