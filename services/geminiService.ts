
import { GoogleGenAI } from "@google/genai";

export const upscaleImage = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Strip prefix if exists
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            text: 'Please perform a high-quality 5x super-resolution upscale on this image segment. The target output should have 5 times the width and 5 times the height of the original input. Maintain the original colors, sharp details, and textures perfectly without adding any artistic changes. Output the processed high-resolution image.',
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error('No image returned from AI');
  } catch (error) {
    console.error('Upscale failed:', error);
    throw error;
  }
};
