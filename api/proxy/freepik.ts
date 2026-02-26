export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.FREEPIK_API_KEY || process.env.VITE_FREEPIK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Freepik API Key not configured on server" });
  }

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
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Freepik Proxy Error:", error);
    return res.status(500).json({ error: error.message || "Failed to communicate with Freepik API" });
  }
}
