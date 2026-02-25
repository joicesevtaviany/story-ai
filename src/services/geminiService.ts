import { GoogleGenAI, Type } from "@google/genai";
import { useBookStore } from "../store/useBookStore";

const getGenAI = () => {
  const { geminiApiKey } = useBookStore.getState();
  
  // Priority: 1. User's custom key in Settings, 2. VITE_ env var (Netlify), 3. process.env (AI Studio)
  let apiKey = geminiApiKey || 
               import.meta.env.VITE_GEMINI_API_KEY || 
               (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

  // Trim whitespace to prevent network errors
  apiKey = apiKey?.trim();

  if (!apiKey) {
    throw new Error("Gemini API Key tidak ditemukan. Silakan masukkan di menu Pengaturan atau atur VITE_GEMINI_API_KEY di environment variables.");
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
  try {
    const genAI = getGenAI();
    // Use a lightweight text model to test general connectivity
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: "Hi" }] }]
    });
    return !!response.text;
  } catch (error: any) {
    console.error("Connection Test Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  const { imageEngine, freepikApiKey, geminiApiKey } = useBookStore.getState();

  // Priority for Freepik Key: 1. Store (Settings), 2. Environment Variable
  const effectiveFreepikKey = freepikApiKey || import.meta.env.VITE_FREEPIK_API_KEY;

  if (imageEngine === 'freepik' && effectiveFreepikKey) {
    return generateImageFreepik(prompt, effectiveFreepikKey);
  }

  // Explicit check before calling API
  const apiKey = geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey && typeof process === 'undefined') {
     throw new Error("Gemini API Key tidak ditemukan. Silakan atur VITE_GEMINI_API_KEY di Netlify.");
  }

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

    let imageUrl = "";
    let refusalReason = "";

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("Google AI tidak memberikan respon. Cek kuota API Anda.");
    }

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
      throw new Error(refusalReason || "Gagal mendapatkan gambar. Cek apakah akun Anda diizinkan membuat gambar di wilayah ini.");
    }
    
    return imageUrl;
  } catch (error: any) {
    console.error("generateImage Error Details:", error);
    
    if (error.message.includes('fetch') || error.name === 'TypeError') {
      throw new Error("Koneksi diblokir oleh Browser/Jaringan. Coba matikan Ad-Blocker, VPN, atau gunakan Jendela Penyamaran (Incognito).");
    }
    
    throw error;
  }
};
