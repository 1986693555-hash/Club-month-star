import { GoogleGenAI } from "@google/genai";
import { AwardType } from "../types";

// Helper to init AI
const getAI = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("API Key is missing. AI features will run in mock mode or fail.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to remove white background from an image via Canvas pixel manipulation.
 * Since Generative models often return a white background when asked to isolate,
 * we need to make it transparent manually for the poster.
 */
const removeWhiteBackground = (base64Data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve(base64Data);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Data);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Loop through pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Use a "fuzziness" tolerance. 
        // Distance from pure white (255, 255, 255)
        const diff = Math.sqrt(
          Math.pow(255 - r, 2) +
          Math.pow(255 - g, 2) +
          Math.pow(255 - b, 2)
        );

        // If distance is within 45 (approx 15% range), assume it's background
        if (diff < 60) {
          data[i + 3] = 0; // Transparent
        } else if (diff < 90) {
          // Slight feathered edge
          data[i + 3] = ((diff - 60) / 30) * 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => {
      console.error("Image load failed for bg removal", e);
      resolve(base64Data);
    };
    // Ensure base64 prefix
    img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
  });
};

/**
 * Generates an inspiring basketball quote based on the award type and student name.
 */
export const generateQuote = async (studentName: string, awardType: AwardType): Promise<string> => {
  try {
    const ai = getAI();
    // Using a lighter model for text
    const model = "gemini-3-flash-preview";

    const prompt = `
      You are a passionate basketball coach for "Li Yuanyu Basketball Club".
      Write a short, punchy, inspiring quote (max 15 words) in Chinese for a student named ${studentName}.
      
      Context:
      Award: ${awardType === AwardType.PRACTICE_STAR ? 'Attendance/Hard Work (Practice Star)' : 'Improvement (Progress Star)'}.
      
      Tone: Energetic, professional, concise.
      Output ONLY the quote string.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || "努力是奇迹的别名。";
  } catch (error) {
    console.error("Gemini Quote Error:", error);
    return "汗水铸就荣耀，坚持成就梦想。"; // Fallback
  }
};

/**
 * Processes an image to "remove background" (Simulated via Generative Image create/edit)
 * Updated to request FULL BODY specifically on pure white, then strips white.
 */
export const processImageBackground = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash-image";

    // Prompt optimized for subsequent removal
    const prompt = "Re-generate this person on a pure solid white background (#FFFFFF). Keep the person exactly the same. Ensure full body is visible. High contrast between subject and background.";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
    });

    // Check for image in response parts
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const generatedBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          // Post-process to remove the white background we requested
          return await removeWhiteBackground(generatedBase64);
        }
      }
    }

    throw new Error("No image generated");

  } catch (error) {
    console.error("Gemini Image Error:", error);
    return `data:image/jpeg;base64,${base64Image}`;
  }
};

/**
 * Edits an image using a text prompt (Gemini 2.5 Flash Image).
 */
export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash-image";

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};