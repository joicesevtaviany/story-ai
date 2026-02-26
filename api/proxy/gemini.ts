import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, type, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Gemini API Key not configured on server" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    if (type === 'image') {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });
      const candidates = response.candidates || [];
      return res.json({ candidates });
    } else {
      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });
      return res.json(response);
    }
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to communicate with Gemini API"
    });
  }
}
