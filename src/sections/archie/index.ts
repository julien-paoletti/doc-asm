import './archie.css';
import type { SectionPlugin } from '../../types.js';
import { ArchieViewer } from '@julien-paoletti/archie-viewer';
import type { SerializedDiagram } from '@julien-paoletti/archie-viewer';
import { icon } from '../../utils/icons.js';
import { generateId } from '../../utils/id.js';

const viewers = new Map<string, ArchieViewer>(); // sectionId → live viewer
export function getViewer(sectionId: string): ArchieViewer | null {
  return viewers.get(sectionId) ?? null;
}

export interface ArchieData extends Record<string, unknown> {
  diagram: SerializedDiagram | null;
  filename: string;
}

export const ArchiePlugin: SectionPlugin<ArchieData> = {
  typeId: 'archie',
  label: 'Architecture diagram',
  icon: icon('diagram'),
  defaultData: { diagram: null, filename: '' },

  createEditor(id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'archie-editor';

    const canvasId = `archie-canvas-${generateId()}`;
    let currentDiagram = data.diagram;
    let currentFilename = data.filename;
    let viewer: ArchieViewer | null = null;

    function openFilePicker(): void {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) void loadFile(file);
      };
      input.click();
    }

    async function loadFile(file: File): Promise<void> {
      try {
        const text = await file.text();
        const diagram = JSON.parse(text) as SerializedDiagram;
        currentDiagram = diagram;
        currentFilename = file.name;
        onChange({ diagram, filename: file.name });
        render();
      } catch {
        // ignore — invalid JSON, user can retry
      }
    }

    function mountViewer(): void {
      if (viewer) { viewer.destroy(); viewer = null; }
      if (!currentDiagram) return;
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      viewer = new ArchieViewer(canvasId, { fitPadding: 40 });
      viewer.load(currentDiagram);
      viewer.fitToContent();
      viewers.set(id, viewer);
    }

    function render(): void {
      viewer?.destroy();
      viewer = null;
      viewers.delete(id);
      wrapper.innerHTML = '';

      if (!currentDiagram) {
        const dropzone = document.createElement('div');
        dropzone.className = 'archie-editor__dropzone';
        dropzone.innerHTML = `
          ${icon('diagram')}
          <span class="archie-editor__dropzone-label">Drop an Archie diagram or click to select</span>
          <span class="archie-editor__dropzone-hint">.json — exported from Archie</span>
        `;
        dropzone.addEventListener('click', openFilePicker);
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-over'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-over');
          const file = e.dataTransfer?.files[0];
          if (file) void loadFile(file);
        });
        wrapper.appendChild(dropzone);
      } else {
        const viewerEl = document.createElement('div');
        viewerEl.className = 'archie-editor__viewer';

        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.className = 'archie-editor__canvas';

        const filenameEl = document.createElement('div');
        filenameEl.className = 'archie-editor__filename';
        filenameEl.textContent = currentFilename;

        const toolbar = document.createElement('div');
        toolbar.className = 'archie-editor__toolbar';

        const fitBtn = document.createElement('button');
        fitBtn.type = 'button';
        fitBtn.className = 'archie-editor__btn';
        fitBtn.innerHTML = `${icon('diagram')} Fit`;
        fitBtn.addEventListener('click', () => viewer?.fitToContent());

        const replaceBtn = document.createElement('button');
        replaceBtn.type = 'button';
        replaceBtn.className = 'archie-editor__btn';
        replaceBtn.innerHTML = `${icon('diagram')} Replace`;
        replaceBtn.addEventListener('click', openFilePicker);

        toolbar.appendChild(fitBtn);
        toolbar.appendChild(replaceBtn);

        viewerEl.appendChild(canvas);
        if (currentFilename) viewerEl.appendChild(filenameEl);
        viewerEl.appendChild(toolbar);
        wrapper.appendChild(viewerEl);

        // Canvas must be in the DOM before ArchieViewer can bind to it
        requestAnimationFrame(mountViewer);
      }
    }

    render();

    return {
      el: wrapper,
      update(d) {
        if (d.diagram !== currentDiagram) {
          currentDiagram = d.diagram;
          currentFilename = d.filename;
          render();
        }
      },
    };
  },
};
