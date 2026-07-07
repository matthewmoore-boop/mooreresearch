import { GoogleGenAI } from "@google/genai";
import fsPromises from 'fs/promises';
import path from 'path';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5',
  'gemini-1.5-pro',
  'gemini-1.5-mini',
  'text-bison-001',
  'chat-bison-001',
];

async function extractText(response) {
  if (!response) return '';
  if (typeof response.text === 'function') {
    return await response.text();
  }
  if (typeof response.text === 'string') {
    return response.text;
  }
  if (typeof response.output === 'string') {
    return response.output;
  }
  if (Array.isArray(response.candidates) && response.candidates.length > 0) {
    const first = response.candidates[0];
    return first?.text || first?.output || JSON.stringify(first);
  }
  if (response.response) {
    return extractText(response.response);
  }
  return JSON.stringify(response);
}

async function generateWithModel(ai, modelId, prompt) {
  return ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: { maxOutputTokens: 1000 },
  });
}

async function listModelIds(ai) {
  const ids = [];
  try {
    const pager = await ai.models.list();
    for await (const model of pager) {
      if (!model) continue;
      const rawName = model.name || model.id || model.model || model.displayName || '';
      const candidate = String(rawName).split('/').pop();
      if (candidate) ids.push(candidate);
    }
  } catch (err) {
    console.warn('listModelIds failed:', err);
  }
  return Array.from(new Set(ids));
}

async function persistChosenModel(modelId) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let envContent = '';

  try {
    envContent = await fsPromises.readFile(envPath, 'utf8');
  } catch (e) {
    envContent = '';
  }

  if (envContent.includes('GENERATIVE_MODEL=')) {
    envContent = envContent.replace(/GENERATIVE_MODEL=.*/g, `GENERATIVE_MODEL=${modelId}`);
  } else {
    if (envContent && !envContent.endsWith('\n')) envContent += '\n';
    envContent += `GENERATIVE_MODEL=${modelId}\n`;
  }

  await fsPromises.writeFile(envPath, envContent, 'utf8');
  return { ok: true, path: '.env.local', model: modelId };
}

function stringifyContent(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(stringifyContent).filter(Boolean).join('\n');
  }
  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (Array.isArray(value.content)) return stringifyContent(value.content);
    if (value.content && typeof value.content === 'object') return stringifyContent(value.content);
    if (typeof value.attrs?.text === 'string') return value.attrs.text;
  }
  return '';
}

function buildPrompt(action, content, selectionText, selectionNodeType, selectionNode) {
  const sourceText = selectionText || stringifyContent(content);
  const nodeContext = selectionNodeType ? `Selected node type: ${selectionNodeType}\n${selectionNode ? JSON.stringify(selectionNode, null, 2) : ''}` : '';
  const contextBlock = nodeContext ? `Context:\n${nodeContext}\n\n` : '';

  switch (action) {
    case 'improve':
      return `You are an expert editor. Improve the clarity, flow, and grammar of the provided text while preserving the original meaning. Return ONLY the rewritten text.\n\n${contextBlock}Text:\n${sourceText}`;
    case 'tone':
      return `You are an expert editor. Rewrite the provided text in a more formal tone while preserving the original meaning. Return ONLY the rewritten text.\n\n${contextBlock}Text:\n${sourceText}`;
    case 'table-commentary':
      return `You are an expert financial research analyst. Create a concise commentary paragraph about the provided table, chart, or image content. Return ONLY the commentary text.\n\n${contextBlock}Content:\n${sourceText}`;
    case 'summarize':
    default:
      return `You are an expert financial research analyst.\n\nThe following is the content of a research report from a TipTap editor.\nYour task is to write a concise, professional executive summary of no more than three bullet points. Focus on the investment thesis, key valuation points, and primary risks. Return ONLY the summary text.\n\nReport Content:\n${sourceText}`;
  }
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response('Internal Server Error: AI API key not configured.', { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const initialModelId = process.env.GENERATIVE_MODEL || DEFAULT_MODEL;

  try {
    const req = await request.json();
    const action = req?.action || 'summarize';
    const documentContent = req?.content;
    const selectionText = req?.selectionText;
    const selectionNodeType = req?.selectedNodeType;
    const selectionNode = req?.selectedNode;

    if (!documentContent && !selectionText && !selectionNode) {
      return new Response(JSON.stringify({ error: 'No content provided in request body (expected { content } or selection data)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const prompt = buildPrompt(action, documentContent, selectionText, selectionNodeType, selectionNode);

    let result;
    try {
      result = await generateWithModel(ai, initialModelId, prompt);
    } catch (genErr) {
      console.error('Generative API call failed for model', initialModelId, genErr);

      let availableModels = null;
      try {
        const candidateIds = await listModelIds(ai);
        availableModels = candidateIds.length ? candidateIds : FALLBACK_MODELS;

        const candidatesToTry = candidateIds.filter(id => id && id !== initialModelId);
        if (!candidatesToTry.length) {
          candidatesToTry.push(...FALLBACK_MODELS.filter(id => id !== initialModelId));
        }

        for (const candidateId of candidatesToTry) {
          try {
            const tryResult = await generateWithModel(ai, candidateId, prompt);
            const generatedText = await extractText(tryResult);
            let writeResult = null;
            try {
              writeResult = await persistChosenModel(candidateId);
            } catch (writeErr) {
              console.error('Failed to write .env.local for chosen candidate:', writeErr);
              writeResult = { ok: false, error: String(writeErr) };
            }

            const responsePayload = action === 'summarize'
              ? { summary: generatedText, model: candidateId, writeResult }
              : { result: generatedText, model: candidateId, action, writeResult };

            return new Response(JSON.stringify(responsePayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } catch (candidateErr) {
            console.warn('Candidate model failed:', candidateId, candidateErr);
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

    const generatedText = await extractText(result);
    const responsePayload = action === 'summarize'
      ? { summary: generatedText, model: initialModelId }
      : { result: generatedText, model: initialModelId, action };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('AI generation error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate response', details: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const ids = await listModelIds(ai);
    const chosenModel = ids[0] || null;

    let writeResult = null;
    if (chosenModel) {
      try {
        writeResult = await persistChosenModel(chosenModel);
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
