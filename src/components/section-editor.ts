import type { Section } from '../types.js';
import { store } from '../store/store.js';
import { getPlugin } from '../sections/registry.js';
import { icon } from '../utils/icons.js';

export class SectionEditor {
  readonly el: HTMLElement;
  private focusTitle?: () => void;

  constructor(documentId: string, section: Section) {
    this.el = document.createElement('div');
    this.el.className = 'section-editor';
    this.el.dataset['sectionId'] = section.id;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle section-drag-handle';
    dragHandle.setAttribute('aria-label', 'Move section');
    dragHandle.innerHTML = icon('gripHorizontal');

    const controls = document.createElement('div');
    controls.className = 'section-controls';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn section-delete-btn';
    deleteBtn.title = 'Delete section';
    deleteBtn.innerHTML = icon('trash');
    deleteBtn.addEventListener('click', () => store.removeSection(documentId, section.id));
    controls.appendChild(deleteBtn);

    const plugin = getPlugin(section.type);
    const { el: contentEl, focusTitle } = plugin.createEditor(section.data as never, (patch) => {
      store.updateSectionData(documentId, section.id, patch as Record<string, unknown>);
    });
    this.focusTitle = focusTitle;

    this.el.appendChild(dragHandle);
    this.el.appendChild(contentEl);
    this.el.appendChild(controls);
  }

  focus(): void {
    this.focusTitle?.();
  }

  destroy(): void {
    this.el.remove();
  }
}
