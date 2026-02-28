import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { useBookStore } from "../store/useBookStore";

const getAiInstance = (customKey?: string) => {
  const apiKey = customKey || useBookStore.getState().geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key tidak ditemukan. Silakan atur di menu Pengaturan.");
  }
  return new GoogleGenAI({ apiKey });
};

export const validateGeminiKey = async (key: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: "Hi" }] }],
      config: { maxOutputTokens: 1 }
    });
    return { valid: true, message: "API Key valid!" };
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes("leaked")) {
      msg = "API Key ini telah bocor dan dinonaktifkan oleh Google. Silakan gunakan kunci baru.";
    }
    return { valid: false, message: msg };
  }
};

export const generateImageFreepik = async (prompt: string) => {
  const { freepikApiKey } = useBookStore.getState();
  
  try {
    const response = await fetch('/api/proxy/freepik', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        prompt,
        apiKey: freepikApiKey // Optional override
      })
    });

    if (!response.ok) {
      const error = await response.json();
      const msg = error.message || error.error || 'Freepik API Error';
      if (msg.includes('not configured on server')) {
        throw new Error("API Key Freepik belum diatur di server. Silakan masukkan API Key di menu Pengaturan atau hubungi admin.");
      }
      throw new Error(msg);
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

export const generateImagePollinations = async (prompt: string) => {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
  
  try {
    // Fetch the image and convert to base64 to ensure it's "locked in" and can be uploaded to Supabase
    const response = await fetch(url);
    if (!response.ok) throw new Error("Pollinations fetch failed");
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Pollinations Error (falling back to URL):", error);
    return url; // Fallback to direct URL if fetch fails
  }
};

export const generateImageHuggingFace = async (prompt: string, retryCount = 0): Promise<string> => {
  const { huggingFaceApiKey } = useBookStore.getState();
  
  try {
    const response = await fetch('/api/proxy/huggingface', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        prompt,
        apiKey: huggingFaceApiKey 
      })
    });

    if (response.status === 503 && retryCount < 5) {
      const data = await response.json();
      const waitTime = (data.estimated_time || 10) * 1000;
      console.log(`Hugging Face model loading, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return generateImageHuggingFace(prompt, retryCount + 1);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || "Hugging Face API Error: " + response.statusText);
    }

    const result = await response.json();
    return result.data; // This is already base64 from proxy
  } catch (error: any) {
    console.error("Hugging Face Error:", error);
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Gagal terhubung ke server. Pastikan koneksi internet stabil atau coba lagi nanti.");
    }
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
  referenceImage?: string; // Base64
}) => {
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
  ${formData.referenceImage ? "Use the provided reference image to influence the character design and overall style." : ""}

  Return the response in JSON format.
  IMPORTANT: The story text MUST be in ${formData.language || "Indonesian"}.`;

  const ai = getAiInstance();
  try {
    const parts: any[] = [{ text: prompt }];
    if (formData.referenceImage) {
      const base64Data = formData.referenceImage.split(',')[1];
      const mimeType = formData.referenceImage.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
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

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    if (error.message.includes("leaked")) {
      throw new Error("API Key Gemini Anda telah bocor dan dinonaktifkan oleh Google. Silakan buat API Key baru di aistudio.google.com dan perbarui di menu Pengaturan.");
    }
    throw error;
  }
};

export const testConnection = async () => {
  const ai = getAiInstance();
  try {
    await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: "Hi" }] }],
      config: { maxOutputTokens: 1 }
    });
    return true;
  } catch (error: any) {
    if (error.message.includes("leaked")) {
      throw new Error("API Key Gemini Anda telah bocor dan dinonaktifkan oleh Google. Silakan buat API Key baru di aistudio.google.com dan perbarui di menu Pengaturan.");
    }
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  const { imageEngine } = useBookStore.getState();

  if (imageEngine === 'freepik') {
    return generateImageFreepik(prompt);
  }
  
  if (imageEngine === 'pollinations') {
    return generateImagePollinations(prompt);
  }

  if (imageEngine === 'huggingface') {
    return generateImageHuggingFace(prompt);
  }

  const ai = getAiInstance();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    const parts = response.candidates?.[0]?.content?.parts || [];
    
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
      throw new Error(refusalReason || "Model tidak mengembalikan data gambar.");
    }
    
    return imageUrl;
  } catch (error: any) {
    if (error.message.includes("leaked")) {
      throw new Error("API Key Gemini Anda telah bocor dan dinonaktifkan oleh Google. Silakan buat API Key baru di aistudio.google.com dan perbarui di menu Pengaturan.");
    }
    console.error("generateImage Error:", error);
    throw error;
  }
};
