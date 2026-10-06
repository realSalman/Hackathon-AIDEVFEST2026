/**
 * AI-assisted document matching using Groq API (LLaMA models).
 * User provides their own API key. Calls are made directly from the browser.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function buildPrompt(requirements, files, tender) {
  const unmatchedReqs = requirements
    .map((r) => `- ${r.id}: "${r.title_en}" (${r.mandatory ? 'mandatory' : 'optional'})`)
    .join('\n');

  const fileList = files
    .map((f) => `- ${f.id}: "${f.name}" (${f.pageCount} page${f.pageCount !== 1 ? 's' : ''})`)
    .join('\n');

  return `You are matching uploaded PDF files to tender document requirements.

Context:
- Tender: "${tender.title}" (ID: ${tender.tender_id})
- Procuring Entity: ${tender.procuring_entity}
- Bidder: ${tender.bidder}

Requirements (to match):
${unmatchedReqs}

Uploaded files (to assign):
${fileList}

Instructions:
1. Match each file to the most appropriate requirement based on filename.
2. A file named "scan_0042.pdf" or similar generic names might be any document — guess the most likely match based on what's left unmatched.
3. If two files could match the same requirement (e.g. trade_license_2025 and trade_license_2026), pick the newer one.
4. Each file can only match one requirement, each requirement can only have one file.

Return ONLY valid JSON (no markdown, no explanation):
{"matches":[{"reqId":"R01","fileId":"f_1","confidence":0.95,"reason":"filename contains trade_license"}]}

Only include matches with confidence >= 0.5.`;
}

/**
 * Call Groq API for AI-assisted matching.
 *
 * @param {string} apiKey — user's Groq API key
 * @param {Array} requirements — unmatched requirements
 * @param {Array} files — unmatched files [{ id, name, pageCount }]
 * @param {Object} tender — tender metadata
 * @returns {Promise<Array<{ reqId, fileId, confidence, reason }>>}
 */
export async function aiMatch(apiKey, requirements, files, tender) {
  const prompt = buildPrompt(requirements, files, tender);

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a document classification assistant. Return ONLY valid JSON, no markdown fences, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `API error: ${response.status}`;
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited — wait a moment and retry');
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from AI');

  // Parse JSON — handle possible markdown fences
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.matches || !Array.isArray(parsed.matches)) {
    throw new Error('Invalid response format');
  }

  return parsed.matches;
}

/**
 * Test API key validity with a minimal request.
 */
export async function testApiKey(apiKey) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: 'Say "ok"' }],
      max_tokens: 5,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API key');
    throw new Error(`API error: ${response.status}`);
  }

  return true;
}
