import { GoogleGenAI, Type } from "@google/genai";
import { useBookStore } from "../store/useBookStore";

const callGeminiProxy = async (payload: any) => {
  const { geminiApiKey } = useBookStore.getState();
  
  const response = await fetch('/api/proxy/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      apiKey: geminiApiKey // Optional override
    })
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error || `Server Error (${response.status})`;
    
    if (errorMessage.includes("leaked")) {
      throw new Error("API Key Gemini Anda telah bocor dan dinonaktifkan oleh Google. Silakan buat API Key baru di aistudio.google.com dan perbarui di menu Pengaturan.");
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const validateGeminiKey = async (key: string) => {
  // We still test locally for validation if the user just typed it
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: "Hi" }] }],
      config: { maxOutputTokens: 1 }
    });
    return { valid: true, message: "API Key valid!" };
  } catch (error: any) {
    return { valid: false, message: error.message };
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

  const response = await callGeminiProxy({
    model: "gemini-2.0-flash",
    contents: [{ parts: [{ text: prompt }] }],
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

  // Extract text from response
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(text);
};

export const testConnection = async () => {
  try {
    await callGeminiProxy({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text: "Hi" }] }]
    });
    return true;
  } catch (error: any) {
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  const { imageEngine, freepikApiKey } = useBookStore.getState();

  if (imageEngine === 'freepik') {
    return generateImageFreepik(prompt);
  }

  try {
    const response = await callGeminiProxy({
      type: 'image',
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
      throw new Error(refusalReason || "Model tidak mengembalikan data gambar.");
    }
    
    return imageUrl;
  } catch (error: any) {
    console.error("generateImage Error:", error);
    throw error;
  }
};
