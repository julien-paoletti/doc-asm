const MAX_WIDTH = 1600; // 2× the editor card width, covers hi-DPI displays

// Detect WebP support once at module load — avoids encoding both formats on every upload
const supportsWebP: Promise<boolean> = new Promise((resolve) => {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  // toDataURL returns 'data:,' (or a non-webp prefix) when unsupported
  resolve(probe.toDataURL('image/webp').startsWith('data:image/webp'));
});

export async function processImage(file: File): Promise<string> {
  const webpOk = await supportsWebP;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

      let result: string;
      if (webpOk) {
        result = canvas.toDataURL('image/webp', 0.92);
      } else {
        result = file.type === 'image/png'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.92);
      }

      // Release canvas pixel buffer
      canvas.width = 0;
      canvas.height = 0;

      resolve(result);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
