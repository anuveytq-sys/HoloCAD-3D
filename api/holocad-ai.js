const ALLOWED_ORIGINS = new Set([
  'https://anuveytq-sys.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
]);
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_QUESTION = 2000;
const MAX_CONTEXT = 5000;

function setCors(req, res) {
  const origin = String(req.headers?.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = String(req.headers?.origin || '');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ error: 'Origin not allowed.' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(503).json({ error: 'OpenRouter is not configured on the secure AI backend yet.' });

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const model = String(body.model || DEFAULT_MODEL).trim().slice(0, 160);
    const question = String(body.question || '').trim().slice(0, MAX_QUESTION);
    const context = String(body.context || '').trim().slice(0, MAX_CONTEXT);
    const test = Boolean(body.test);
    if (!question && !test) return res.status(400).json({ error: 'Question is required.' });

    const system = [
      'You are HoloCAD AI, an engineering education assistant inside a browser-based 3D engineering studio.',
      'Be accurate, concise and practical. Explain mechanisms and engineering principles clearly.',
      'The geometry is illustrative, not manufacturing-certified CAD.',
      'Never invent measurements or properties that are not supplied.',
      'Distinguish conceptual guidance from certified engineering analysis.',
      'Use the active HoloCAD machine/component context below when relevant.',
      '',
      'ACTIVE HOLOCAD CONTEXT:',
      context || 'No additional context was supplied.',
    ].join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anuveytq-sys.github.io/HoloCAD-3D/',
        'X-Title': 'HoloCAD Engineering Studio',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: test ? 'Reply with exactly: HoloCAD AI connection OK.' : question },
        ],
        temperature: 0.25,
        max_tokens: 700,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || `OpenRouter request failed (${response.status})` });
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: 'The selected model returned no response.' });
    return res.status(200).json({ answer, model });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Secure AI service failed.' });
  }
}
