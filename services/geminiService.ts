
/**
 * 本地高清增强函数
 * 不再调用 Gemini API，改用浏览器 Canvas 渲染引擎进行高质量重建
 * 实现 4K 级别的像素增强 (宽度 3840px)
 */
export const upscaleImage = async (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // 定义 4K 目标宽度
        const targetWidth = 3840;
        const scaleFactor = targetWidth / img.width;
        
        // 如果原图已经很大，则保持原样或仅做少量增强
        if (img.width >= targetWidth) {
          resolve(base64Image);
          return;
        }

        canvas.width = targetWidth;
        canvas.height = img.height * scaleFactor;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error("无法初始化渲染上下文");
        }

        // 启用浏览器最高质量的图像平滑算法
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 执行高清绘制
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 输出高质量 PNG
        resolve(canvas.toDataURL('image/png', 1.0));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = base64Image;
  });
};
