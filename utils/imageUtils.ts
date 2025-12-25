import JSZip from 'jszip';

/**
 * High-Precision Uniform Image Splitting Engine
 * 
 * 1. Calculates the exact integer size for output tiles using Math.floor to ensure uniformity.
 * 2. Uses floating-point arithmetic to map source coordinates (sx, sy, sw, sh).
 * 3. Prevents "pixel drift" or cumulative errors by calculating coordinates relative to the original source.
 */
export const splitImage = async (
  imageSrc: string,
  cols: number,
  rows: number
): Promise<{ tiles: string[], info: { originalW: number, originalH: number, tileW: number, tileH: number } }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const originalW = img.width;
      const originalH = img.height;

      // Calculate uniform integer dimensions for output tiles
      // Every tile MUST be this size to be "uniform"
      const tileW = Math.floor(originalW / cols);
      const tileH = Math.floor(originalH / rows);

      // Exact floating-point step size for sampling the source
      const stepW = originalW / cols;
      const stepH = originalH / rows;

      const results: string[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileW;
          canvas.height = tileH;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) continue;

          // Enable high-quality scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          /**
           * We sample the source using floating point coordinates (sx, sy, sw, sh).
           * This maps the exact mathematical nth-part of the original image 
           * to the uniform integer tile.
           */
          const sx = c * stepW;
          const sy = r * stepH;
          const sw = stepW;
          const sh = stepH;

          ctx.drawImage(
            img,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            tileW,
            tileH
          );
          
          results.push(canvas.toDataURL('image/png', 1.0));
        }
      }

      resolve({
        tiles: results,
        info: { originalW, originalH, tileW, tileH }
      });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
};

export const downloadDataUrl = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const createZipAndDownload = async (images: string[]) => {
  const zip = new JSZip();
  images.forEach((url, index) => {
    const base64Data = url.split(',')[1];
    zip.file(`split_tile_${index + 1}.png`, base64Data, { base64: true });
  });
  
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  downloadDataUrl(url, `uniform_split_tiles.zip`);
  URL.revokeObjectURL(url);
};
