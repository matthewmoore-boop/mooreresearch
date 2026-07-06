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
    const documentContent = req?.content;

    if (!documentContent) {
      return new Response(JSON.stringify({ error: 'No content provided in request body (expected { content })' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Construct the prompt for the AI
    const prompt = `You are an expert financial research analyst.\n\nThe following is the JSON content of a research report from a TipTap editor.\nYour task is to write a concise, professional executive summary of no more than three bullet points. Focus on the investment thesis, key valuation points, and primary risks. Return ONLY the summary text.\n\nReport Content:\n${JSON.stringify(documentContent)}`;

    // 5. Send the prompt to the AI and get the response
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (genErr) {
      console.error('Generative API call failed:', genErr);
      return new Response(JSON.stringify({ error: 'Generative API call failed', details: String(genErr) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    // Some client libraries return different shapes; attempt to read text safely
    try {
      const response = await result?.response;
      const summaryText = typeof response?.text === 'function' ? await response.text() : (response?.output || response?.candidates || JSON.stringify(response));

      return new Response(JSON.stringify({ summary: summaryText }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (readErr) {
      console.error('Error reading model response:', readErr, 'raw result:', result);
      return new Response(JSON.stringify({ error: 'Error reading model response', details: String(readErr), raw: result }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (err) {
    console.error('AI generation error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate summary', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}