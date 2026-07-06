import { GoogleGenerativeAI } from "@google/generative-ai";
import fsPromises from 'fs/promises';
import path from 'path';

// This is your new AI endpoint.
export async function POST(request) {
  // 1. Get the API key from your secure environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response("Internal Server Error: AI API key not configured.", { status: 500 });
  }

  // 2. Initialize the AI client
  const genAI = new GoogleGenerativeAI(apiKey);
  const initialModelId = process.env.GENERATIVE_MODEL || "gemini-pro";
  let model = genAI.getGenerativeModel({ model: initialModelId });

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
      console.error('Generative API call failed for model', initialModelId, genErr);

      // Attempt to list models and automatically try alternatives.
      let availableModels = null;
      try {
        if (typeof genAI.listModels === 'function') {
          const listRaw = await genAI.listModels();
          availableModels = Array.isArray(listRaw) ? listRaw : listRaw?.models || listRaw;

          // Extract candidate model ids (flexible for different response shapes)
          const candidateIds = [];
          if (Array.isArray(availableModels)) {
            for (const m of availableModels) {
              if (typeof m === 'string') {
                candidateIds.push(m);
              } else if (m?.name) {
                // name might be like "models/gemini-1.5"
                const parts = String(m.name).split('/');
                candidateIds.push(parts[parts.length - 1]);
              } else if (m?.id) {
                candidateIds.push(m.id);
              } else if (m?.model) {
                candidateIds.push(m.model);
              }
            }
          }

          // Remove duplicates and the initial model id
          const uniqueCandidates = Array.from(new Set(candidateIds)).filter(x => x && x !== initialModelId);

          // Try each candidate in order until one succeeds
          for (const candidateId of uniqueCandidates) {
            try {
              const candidateModel = genAI.getGenerativeModel({ model: candidateId });
              const tryResult = await candidateModel.generateContent(prompt);
              // try to read response similarly to the primary path
              const tryResponse = await tryResult?.response;
              const tryText = typeof tryResponse?.text === 'function' ? await tryResponse.text() : (tryResponse?.output || tryResponse?.candidates || JSON.stringify(tryResponse));
              // success — return immediately
              return new Response(JSON.stringify({ summary: tryText, model: candidateId }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } catch (candidateErr) {
              console.warn('Candidate model failed:', candidateId, candidateErr);
              continue; // try next candidate
            }
          }
        }
      } catch (listErr) {
        console.warn('Failed to list models:', listErr);
        availableModels = `Unable to list models using client: ${String(listErr)}`;
      }

      return new Response(JSON.stringify({
        error: 'Generative API call failed',
        details: String(genErr),
        availableModels,
        hint: 'Model may not be supported for generateContent with this client/API version. Server attempted to auto-pick other models; see availableModels for candidates.'
      }), { status: 502, headers: { 'Content-Type': 'application/json' } });
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

// GET /co-pilot - list available models (helpful for choosing a working model id)
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    if (typeof genAI.listModels !== 'function') {
      return new Response(JSON.stringify({ error: 'listModels() not available on client' }), { status: 501, headers: { 'Content-Type': 'application/json' } });
    }

    const listRaw = await genAI.listModels();
    // Normalize common shapes into an array of candidate ids/names
    let models = [];
    if (Array.isArray(listRaw)) models = listRaw;
    else if (Array.isArray(listRaw?.models)) models = listRaw.models;
    else if (Array.isArray(listRaw?.model)) models = listRaw.model;
    else models = [listRaw];

    // Extract simple identifiers
    const ids = models.map(m => {
      if (!m) return null;
      if (typeof m === 'string') return m;
      if (m.id) return m.id;
      if (m.name) return String(m.name).split('/').pop();
      if (m.model) return m.model;
      return JSON.stringify(m);
    }).filter(Boolean);

    // Auto-pick the first candidate model and persist to .env.local
    const chosenModel = ids[0] || null;
    let writeResult = null;
    if (chosenModel) {
      try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        let envContent = '';
        try {
          envContent = await fsPromises.readFile(envPath, 'utf8');
        } catch (e) {
          // file may not exist yet; we'll create it
          envContent = '';
        }

        if (envContent.includes('GENERATIVE_MODEL=')) {
          envContent = envContent.replace(/GENERATIVE_MODEL=.*/g, `GENERATIVE_MODEL=${chosenModel}`);
        } else {
          if (envContent && !envContent.endsWith('\n')) envContent += '\n';
          envContent += `GENERATIVE_MODEL=${chosenModel}\n`;
        }

        await fsPromises.writeFile(envPath, envContent, 'utf8');
        writeResult = { ok: true, path: '.env.local', model: chosenModel };
      } catch (writeErr) {
        console.error('Failed to write .env.local:', writeErr);
        writeResult = { ok: false, error: String(writeErr) };
      }
    }

    return new Response(JSON.stringify({ models: ids, chosenModel, writeResult }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('List models error:', err);
    return new Response(JSON.stringify({ error: 'Failed to list models', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}