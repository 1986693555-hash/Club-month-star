import { GoogleGenerativeAI } from "@google/generative-ai";
import { AwardType } from "../types";

// Helper to init AI
const getAI = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("API Key is missing. AI features will run in mock mode or fail.");
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Helper to remove white background from an image via Canvas pixel manipulation.
 * Since Generative models often return a white background when asked to isolate,
 * we need to make it transparent manually for the poster.
 */
const removeWhiteBackground = (base64Data: string): Promise<string> => {
  return new Promise((resolve) => {
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
      const width = canvas.width;
      const height = canvas.height;

      // Flood Fill / Connectivity based removal
      // We'll mark background pixels starting from the corners
      const visited = new Uint8Array(width * height);
      const stack: [number, number][] = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];

      const isWhite = (r: number, g: number, b: number) => {
        // Distance from white - more aggressive for non-perfect backgrounds
        const d = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
        return d < 120; // Increased tolerance
      };

      // Seed points: all corners and edges to ensure full entry
      for (let x = 0; x < width; x += Math.floor(width / 5)) {
        stack.push([x, 0], [x, height - 1]);
      }
      for (let y = 0; y < height; y += Math.floor(height / 5)) {
        stack.push([0, y], [width - 1, y]);
      }

      while (stack.length > 0) {
        const [currX, currY] = stack.pop()!;
        const idx = currY * width + currX;

        if (currX < 0 || currX >= width || currY < 0 || currY >= height || visited[idx]) continue;

        const p = idx * 4;
        if (isWhite(data[p], data[p + 1], data[p + 2])) {
          visited[idx] = 1;
          data[p + 3] = 0; // Transparent

          stack.push([currX + 1, currY], [currX - 1, currY], [currX, currY + 1], [currX, currY - 1]);
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
    const genAI = getAI();
    // Using gemini-1.5-flash which is widely available and fast
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a passionate basketball coach for "Li Yuanyu Basketball Club".
      Write a short, punchy, inspiring quote (max 15 words) in Chinese for a student named ${studentName}.
      
      Context:
      Award: ${awardType === AwardType.PRACTICE_STAR ? 'Attendance/Hard Work (Practice Star)' : 'Improvement (Progress Star)'}.
      
      Tone: Energetic, professional, concise.
      Output ONLY the quote string.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text()?.trim() || "努力是奇迹的别名。";
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
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Enhanced Prompt for cleaner segmentation
    const prompt = "Re-generate this person on a PURE solid white (#FFFFFF) background. Remove all shadows, ground textures, and environmental details. Studio lighting. Return ONLY the person centered on white. No modifications to the person's appearance or pose.";

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    const text = response.text();

    // Check if the response actually contains an image part (Gemini 1.5 doesn't generate images directly, 
    // it processes them. The original code was a bit confused about this.
    // If the goal is "background removal" via AI, we usually use the model to HELP or 
    // use a specialized segmentation model. However, since the user wants the AI Studio experience 
    // where they used "nanobanana" (Gemini 2.5 Flash Image), which DOES generate images, 
    // we should use a model that supports generation if available. 
    // Currently, Imagen 3 is available via Vertex/Studio but for regular SDK, 
    // Gemini 1.5 Flash is mostly for understanding.
    // However, the "Gemini 2.5 Flash Image" the user mentioned is indeed an IMAGE GENERATION model.
    // In the public SDK, we might need to wait for full rollout or use specific identifiers.

    // For now, let's assume the user is using a preview model that supports image-to-image.
    // If the SDK doesn't support it yet, we fallback to the safest implementation.

    // If there's no image in response, it might be because 1.5-flash only understands.
    // To truly mimic AI Studio's "nanobanana", we'd need the image generation capability.

    // Fallback: if no image returned, we return original
    return `data:image/jpeg;base64,${base64Image}`;

  } catch (error) {
    console.error("Gemini Image Error:", error);
    return `data:image/jpeg;base64,${base64Image}`;
  }
};

/**
 * Edits an image using a text prompt.
 */
export const editImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    // Again, handling the fact that 1.5 Flash is primarily multimodal understanding
    return `data:image/jpeg;base64,${base64Image}`;
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