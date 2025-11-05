import { GoogleGenAI, Content } from "@google/genai";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const callGeminiAPI = async (
  prompt: string | Content[],
  systemInstruction: string
): Promise<string> => {
  if (!ai) {
    return "Error: API_KEY is not configured. Please set the API_KEY environment variable.";
  }

  const contents: Content[] = typeof prompt === 'string' 
    ? [{ role: 'user', parts: [{ text: prompt }] }] 
    : prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `Error connecting to Gemini API: ${error.message}`;
    }
    return "An unknown error occurred while contacting the Gemini API.";
  }
};