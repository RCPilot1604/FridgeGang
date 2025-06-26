import * as GoogleGenerativeAI from "@google/generative-ai";

const API_KEY = "AIzaSyBCTLyT6F3nXeDcdDWboUCC1JmQTexUcTE";

export async function generateRecipeFromItems(items: string[]): Promise<string> {
  if (!API_KEY) {
    throw new Error("Google Generative AI API key is missing.");
  }

  const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const promptText = `Create a delicious recipe using the following ingredients: ${items.join(", ")}. Include:
- A recipe title
- Ingredients list
- Step-by-step cooking instructions

Make it clear and easy to follow.`;

  try {
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = await response.text(); // This gets the actual text content
    return text;
  } catch (error) {
    console.error("Error generating recipe:", error);
    return "Failed to generate recipe.";
  }
}
