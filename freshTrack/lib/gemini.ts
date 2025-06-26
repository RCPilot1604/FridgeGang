export async function generateRecipeFromItems(items: string[]): Promise<string> {
    const apiKey = "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const promptText = `Create a delicious recipe using the following ingredients: ${items.join(
        ", "
    )}. Include:
  - A recipe title
  - Ingredients list
  - Step-by-step cooking instructions
  
  Make it clear and easy to follow.`;

    const body = {
        contents: [
            {
                parts: [
                    {
                        text: promptText,
                    },
                ],
            },
        ],
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.output || "No recipe generated";
}
