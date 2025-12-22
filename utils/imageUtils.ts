
import JSZip from 'jszip';

export const splitImage = async (
  imageSrc: string,
  cols: number,
  rows: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const results: string[] = [];
      const tileWidth = img.width / cols;
      const tileHeight = img.height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileWidth;
          canvas.height = tileHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(
            img,
            c * tileWidth,
            r * tileHeight,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );
          results.push(canvas.toDataURL('image/png'));
        }
      }
      resolve(results);
    };
    img.onerror = reject;
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
    zip.file(`split_image_${index + 1}.png`, base64Data, { base64: true });
  });
  
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  downloadDataUrl(url, 'all_images.zip');
  URL.revokeObjectURL(url);
};
