import { GoogleGenerativeAI } from "@google/generative-ai";

// This is your new AI endpoint.
export async function POST(request) {
  // 1. Get the API key from your secure environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("Internal Server Error: AI API key not configured.", { status: 500 });
  }

  // 2. Initialize the AI client
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // 3. Get the editor's content from the incoming request
    const req = await request.json();
    const documentContent = req.content; // Assuming the frontend sends a 'content' field

    // 4. Construct the prompt for the AI
    const prompt = `
      You are an expert financial research analyst.
      The following is the JSON content of a research report from a TipTap editor.
      Your task is to write a concise, professional executive summary of no more than three bullet points.
      Focus on the investment thesis, key valuation points, and primary risks.
      Return ONLY the summary text.

      Report Content:
      ${JSON.stringify(documentContent)}
    `;

    // 5. Send the prompt to the AI and get the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summaryText = response.text();

    // 6. Return the generated summary to the frontend
    return new Response(JSON.stringify({ summary: summaryText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("AI generation error:", err);
    return new Response("Failed to generate summary.", { status: 500 });
  }
}