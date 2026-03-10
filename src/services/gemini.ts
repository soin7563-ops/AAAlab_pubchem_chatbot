import { GoogleGenAI } from "@google/genai";
import { ChemicalInfo, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const translateToEnglishName = async (query: string): Promise<{ englishName: string; originalName: string }> => {
  const model = "gemini-3-flash-preview";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ 
        parts: [{ 
          text: `Extract the primary chemical compound name from the following text and translate it to its standard English name. 
          Return ONLY the English name. If no chemical is found, return "NONE".
          Text: "${query}"` 
        }] 
      }],
    });
    const englishName = response.text?.trim() || query;
    
    // Also try to get the normalized version in the original language (e.g. "포름알데히드" from "포름알데히드가 궁금하네")
    const normalizedRes = await ai.models.generateContent({
      model,
      contents: [{ 
        parts: [{ 
          text: `Extract the primary chemical compound name from the following text in its original language. 
          Return ONLY the name, no suffixes or particles (e.g., from "포름알데히드가" return "포름알데히드").
          Text: "${query}"` 
        }] 
      }],
    });
    const originalName = normalizedRes.text?.trim() || query;

    return { englishName, originalName };
  } catch (error) {
    console.error("Translation Error:", error);
    return { englishName: query, originalName: query };
  }
};

export const getGeminiResponse = async (
  userMessage: string,
  history: Message[],
  currentChemical?: ChemicalInfo
) => {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `You are ChemInsight Bot, an expert chemical assistant. 
  You provide accurate, scientific information about chemical compounds.
  When a chemical is currently selected, use its data (CID, Formula, Weight, etc.) to provide context.
  If the user asks for a new chemical, suggest they search for it if you don't have the data.
  Always be professional, concise, and helpful. Use Markdown for formatting.
  
  LANGUAGE SUPPORT:
  - Respond in the language the user uses (e.g., if they ask in Korean, respond in Korean).
  - Provide chemical names in both English and the user's language if helpful.
  
  Current Chemical Context: ${currentChemical ? JSON.stringify(currentChemical) : "None"}`;

  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents as any,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while connecting to the AI service.";
  }
};
