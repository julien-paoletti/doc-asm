import './image.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { processImage } from '../../utils/image.js';
import { AnnotationLayer, COLORS, type Shape, type Tool } from './annotations.js';

export interface ImageData extends Record<string, unknown> {
  src: string;
  shapes: Shape[];
}

const TOOLS: Tool[] = ['select', 'circle', 'arrow'];

const TOOL_ICONS: Record<Tool, string> = {
  select: icon('annotSelect'),
  circle: icon('annotCircle'),
  arrow:  icon('annotArrow'),
};

export const ImagePlugin: SectionPlugin<ImageData> = {
  typeId: 'image',
  label: 'Image',
  icon: icon('image'),
  defaultData: { src: '', shapes: [] },

  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-editor';

    let currentSrc = data.src;
    let currentShapes: Shape[] = data.shapes ?? [];
    let annotLayer: AnnotationLayer | null = null;
    let activeTool: Tool = 'select';
    let activeColor = COLORS[0] ?? '#ef4444';

    // ── Toolbar ──────────────────────────────────────────────────────────────
    const toolbar = document.createElement('div');
    toolbar.className = 'image-editor__toolbar';

    function makeToolBtn(tool: Tool): HTMLButtonElement {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'image-editor__tool-btn';
      btn.title = tool.charAt(0).toUpperCase() + tool.slice(1);
      btn.innerHTML = TOOL_ICONS[tool];
      btn.addEventListener('click', () => {
        activeTool = tool;
        annotLayer?.setTool(tool);
        updateToolbar();
      });
      return btn;
    }

    const toolBtns = TOOLS.map(makeToolBtn);

    const colorPalette = document.createElement('div');
    colorPalette.className = 'image-editor__colors';
    COLORS.forEach((c) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'image-editor__color-dot';
      dot.style.setProperty('--dot-color', c);
      dot.title = c;
      dot.addEventListener('click', () => {
        activeColor = c;
        annotLayer?.setColor(c);
        updateToolbar();
      });
      colorPalette.appendChild(dot);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'image-editor__tool-btn image-editor__delete-btn';
    deleteBtn.title = 'Delete selected shape (Del)';
    deleteBtn.innerHTML = icon('trash');
    deleteBtn.addEventListener('click', () => annotLayer?.deleteSelected());

    const toolbarSep = document.createElement('div');
    toolbarSep.className = 'image-editor__toolbar-sep';

    toolBtns.forEach((btn) => toolbar.appendChild(btn));
    toolbar.appendChild(toolbarSep);
    toolbar.appendChild(colorPalette);
    toolbar.appendChild(deleteBtn);

    function updateToolbar(): void {
      toolBtns.forEach((btn, i) => btn.classList.toggle('is-active', TOOLS[i] === activeTool));
      colorPalette.querySelectorAll<HTMLElement>('.image-editor__color-dot').forEach((dot) => {
        dot.classList.toggle('is-active', dot.style.getPropertyValue('--dot-color') === activeColor);
      });
    }
    updateToolbar();

    // ── File helpers ─────────────────────────────────────────────────────────
    function openFilePicker(): void {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) void loadFile(file);
      };
      input.click();
    }

    async function loadFile(file: File): Promise<void> {
      try {
        currentSrc = await processImage(file);
        currentShapes = [];
        onChange({ src: currentSrc, shapes: currentShapes });
        render();
      } catch {
        // ignore — user can retry
      }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    function render(): void {
      annotLayer?.destroy();
      annotLayer = null;
      wrapper.innerHTML = '';

      if (!currentSrc) {
        const dropzone = document.createElement('div');
        dropzone.className = 'image-editor__dropzone';
        dropzone.innerHTML = `
          ${icon('image')}
          <span class="image-editor__dropzone-label">Drop an image or click to select</span>
          <span class="image-editor__dropzone-hint">PNG, JPEG, WebP, GIF — resized to fit</span>
        `;
        dropzone.addEventListener('click', openFilePicker);
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-over'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-over');
          const file = e.dataTransfer?.files[0];
          if (file?.type.startsWith('image/')) void loadFile(file);
        });
        wrapper.appendChild(dropzone);
      } else {
        wrapper.appendChild(toolbar);

        const preview = document.createElement('div');
        preview.className = 'image-editor__preview';

        const img = document.createElement('img');
        img.className = 'image-editor__img';
        img.src = currentSrc;
        img.alt = '';
        img.addEventListener('dragover', (e) => e.preventDefault());
        img.addEventListener('drop', (e) => {
          e.preventDefault();
          const file = e.dataTransfer?.files[0];
          if (file?.type.startsWith('image/')) void loadFile(file);
        });

        annotLayer = new AnnotationLayer({
          shapes: currentShapes,
          onChange(shapes) {
            currentShapes = shapes;
            onChange({ src: currentSrc, shapes });
          },
        });
        annotLayer.setTool(activeTool);
        annotLayer.setColor(activeColor);
        img.addEventListener('load', () => annotLayer?.redraw());

        const replaceBtn = document.createElement('button');
        replaceBtn.type = 'button';
        replaceBtn.className = 'image-editor__replace-btn';
        replaceBtn.innerHTML = `${icon('image')} Replace`;
        replaceBtn.addEventListener('click', openFilePicker);

        preview.appendChild(img);
        preview.appendChild(annotLayer.el);
        preview.appendChild(replaceBtn);
        wrapper.appendChild(preview);
      }
    }

    render();

    return {
      el: wrapper,
      update(d) {
        if (d.src !== currentSrc) {
          currentSrc = d.src;
          currentShapes = d.shapes ?? [];
          render();
        } else if (d.shapes !== currentShapes) {
          currentShapes = d.shapes ?? [];
          annotLayer?.updateShapes(currentShapes);
        }
      },
    };
  },
};
