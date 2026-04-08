import './image.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { processImage } from '../../utils/image.js';

export interface ImageData extends Record<string, unknown> {
  src: string; // base64 data URL or empty string
}

export const ImagePlugin: SectionPlugin<ImageData> = {
  typeId: 'image',
  label: 'Image',
  icon: icon('image'),
  defaultData: { src: '' },

  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-editor';

    let currentSrc = data.src;

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
        onChange({ src: currentSrc });
        render();
      } catch {
        // ignore — user can retry
      }
    }

    function render(): void {
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

        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('is-over');
        });
        dropzone.addEventListener('dragleave', () => {
          dropzone.classList.remove('is-over');
        });
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-over');
          const file = e.dataTransfer?.files[0];
          if (file?.type.startsWith('image/')) void loadFile(file);
        });

        wrapper.appendChild(dropzone);
      } else {
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

        const replaceBtn = document.createElement('button');
        replaceBtn.type = 'button';
        replaceBtn.className = 'image-editor__replace-btn';
        replaceBtn.innerHTML = `${icon('image')} Replace`;
        replaceBtn.addEventListener('click', openFilePicker);

        preview.appendChild(img);
        preview.appendChild(replaceBtn);
        wrapper.appendChild(preview);
      }
    }

    render();

    return {
      el: wrapper,
      update(d) {
        if (d.src !== currentSrc) { currentSrc = d.src; render(); }
      },
    };
  },
};
