import Sortable from 'sortablejs';

export interface SortableOptions {
  container: HTMLElement;
  group?: string;
  onEnd: (fromIndex: number, toIndex: number) => void;
}

export function makeSortable(opts: SortableOptions): Sortable {
  return Sortable.create(opts.container, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    group: opts.group,
    filter: '[data-no-sort]',
    preventOnFilter: false,
    onEnd(evt) {
      const from = evt.oldIndex;
      const to = evt.newIndex;
      if (from !== undefined && to !== undefined && from !== to) {
        opts.onEnd(from, to);
      }
    },
  });
}
