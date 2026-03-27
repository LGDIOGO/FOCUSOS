
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

async function test() {
  if (!apiKey) {
    console.error("No API key found in env");
    return;
  }

  console.log("Testing with API Key:", apiKey.substring(0, 5) + "...");
  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log("Calling generateContent with gemini-3-flash-preview...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hello, tell me a joke."
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("Gemini 3 Error:", err);
    
    console.log("Falling back to gemini-1.5-flash...");
    try {
      const resp2 = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: "Hello, tell me a joke."
      });
      console.log("Response 1.5:", resp2.text);
    } catch (err2) {
      console.error("Gemini 1.5 Error:", err2);
    }
  }
}

test();
