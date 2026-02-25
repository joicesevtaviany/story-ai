import { GoogleGenAI, Type } from "@google/genai";
import { useBookStore } from "../store/useBookStore";

const getGenAI = () => {
  const { geminiApiKey } = useBookStore.getState();
  
  // Priority: 1. User's custom key in Settings, 2. VITE_ env var (Vercel/Netlify), 3. process.env (AI Studio)
  let apiKey = geminiApiKey || 
               import.meta.env.VITE_GEMINI_API_KEY || 
               (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

  apiKey = apiKey?.trim();

  if (!apiKey || apiKey.length < 10) {
    throw new Error("Gemini API Key tidak valid atau belum diatur. Silakan masukkan API Key di menu Pengaturan.");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const validateGeminiKey = async (key: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Try a very simple request to validate the key
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hi",
      config: { maxOutputTokens: 1 }
    });
    return { valid: true, message: "API Key valid!" };
  } catch (error: any) {
    console.error("Gemini Validation Error:", error);
    return { 
      valid: false, 
      message: error.message || "API Key tidak valid atau sudah habis kuotanya." 
    };
  }
};

export const generateImageFreepik = async (prompt: string, apiKey: string) => {
  try {
    const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey
      },
      body: JSON.stringify({
        prompt: prompt,
        num_images: 1,
        image: {
          size: 'square_1_1'
        },
        styling: {
          style: 'cartoon'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Freepik API Error');
    }

    const data = await response.json();
    if (data.data && data.data[0]) {
      if (data.data[0].base64) {
        return `data:image/png;base64,${data.data[0].base64}`;
      }
      return data.data[0].url;
    }
    throw new Error('No image returned from Freepik');
  } catch (error) {
    console.error("Freepik Error:", error);
    throw error;
  }
};

export const generateStory = async (formData: {
  theme: string;
  mainCharacter: string;
  targetAge: string;
  moralValue: string;
  genre: string;
  illustrationStyle: string;
  characterType: string;
  language?: string;
}) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Create a children's storybook outline with 8 pages.
  Genre: ${formData.genre}
  Theme: ${formData.theme}
  Main Character: ${formData.mainCharacter} (Type: ${formData.characterType})
  Target Age: ${formData.targetAge}
  Moral Value: ${formData.moralValue}
  Language: ${formData.language || "Indonesian"}

  For each page, provide:
  1. The story text (simple, engaging, 50-80 words).
  2. A detailed image prompt for a consistent illustration. 
  Illustration Style: ${formData.illustrationStyle}
  The image prompt MUST describe the character's appearance (hair, clothes, expression) to maintain consistency.
  Style details: ${formData.illustrationStyle}, bright, cute.

  Return the response in JSON format.
  IMPORTANT: The story text MUST be in ${formData.language || "Indonesian"}.`;

  const genAI = getGenAI();
  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.INTEGER },
                content: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["pageNumber", "content", "imagePrompt"]
            }
          }
        },
        required: ["title", "pages"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const testConnection = async () => {
  const { geminiApiKey } = useBookStore.getState();
  let apiKey = geminiApiKey || 
               import.meta.env.VITE_GEMINI_API_KEY || 
               (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  
  apiKey = apiKey?.trim();
  if (!apiKey) throw new Error("API Key tidak ditemukan di Settings maupun Environment Variables.");

  try {
    // Direct fetch test to bypass SDK and get real error codes
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || response.statusText;
      throw new Error(`Google API Error (${response.status}): ${msg}`);
    }
    
    return true;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      throw new Error("Jaringan/Browser memblokir koneksi ke Google API. Coba matikan Ad-Blocker atau gunakan koneksi internet lain.");
    }
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  const { imageEngine, freepikApiKey } = useBookStore.getState();

  const effectiveFreepikKey = freepikApiKey || import.meta.env.VITE_FREEPIK_API_KEY;

  if (imageEngine === 'freepik' && effectiveFreepikKey) {
    return generateImageFreepik(prompt, effectiveFreepikKey);
  }

  let retries = 2;
  let lastError: any = null;

  while (retries > 0) {
    try {
      const genAI = getGenAI();
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("Google AI tidak memberikan respon (Empty Candidates).");
      }

      let imageUrl = "";
      let refusalReason = "";
      const parts = response.candidates[0].content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        } else if (part.text) {
          refusalReason += part.text + " ";
        }
      }

      if (!imageUrl) {
        throw new Error(refusalReason || "Model tidak mengembalikan data gambar. Cek apakah akun Anda diizinkan membuat gambar.");
      }
      
      return imageUrl;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${3 - retries} failed:`, error);
      
      // If it's a network error, retry
      if (error.message?.includes('fetch') || error.name === 'TypeError') {
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw new Error("Gagal terhubung ke Google AI (Network Error). Coba matikan Ad-Blocker/VPN atau gunakan koneksi internet lain.");
      }
      
      // If it's a safety error or other API error, don't retry
      throw error;
    }
  }
  throw lastError;
};
