
import { GoogleGenAI } from "@google/genai";

/**
 * 核心超分辨率重建函数
 * 采用 Gemini 3 Pro Image 模型进行 4K 级别的生成式画质修复
 * 严格使用环境变量中的 API_KEY（由 aistudio 注入）
 */
export const upscaleImage = async (base64Image: string): Promise<string> => {
  // 必须在函数内部实例化以获取最新的 process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            text: `Act as a world-class professional image restoration and neural super-resolution expert. 
            Your task is to perform a Generative High-Fidelity Reconstruction on this image.
            
            REQUIREMENTS:
            1. Target Output: At least 4K resolution (Ultra HD) visual quality.
            2. Detail Synthesis: Do not just upscale pixels. Use your generative capabilities to synthesize missing high-frequency details: realistic skin pores, hair textures, fabric weaves, and sharp architectural edges.
            3. Reconstruction: Remove all compression artifacts, JPEG noise, and digital blur completely.
            4. Fidelity: Maintain 100% of the original composition, color palette, and proportions. Do not add new objects or change the person's identity. 
            5. Sharpness: Ensure surgical precision at boundaries and micro-details.
            
            The final image must look as if it was captured by a high-end 80MP professional DSLR camera with a prime lens. Output the enhanced high-resolution image data.`,
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: "4K",
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error('AI 未返回图像数据。');
  } catch (error: any) {
    console.error('Upscale process error:', error);

    // 处理密钥失效或项目未找到的情况
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("API_KEY_INVALID")) {
      throw new Error("您的 API 密钥已失效或未找到。请点击页面上方的“配置 API 密钥”重新授权。");
    }

    throw new Error(error.message || "4K 重建过程中发生未知错误。");
  }
};
