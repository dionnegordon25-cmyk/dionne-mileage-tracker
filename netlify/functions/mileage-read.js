// Dionne's Mileage Tracker – reads a diary photo/screenshot with Claude and returns the appointments as a table.
// Netlify environment variables: ANTHROPIC_API_KEY, MILEAGE_PIN (optional: MILEAGE_MODEL)
exports.handler = async function (event) {
  const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  const KEY = process.env.ANTHROPIC_API_KEY, PIN = process.env.MILEAGE_PIN;
  if (!KEY || !PIN) return json(500, { error: 'Site settings missing (ANTHROPIC_API_KEY, MILEAGE_PIN)' });
  if (((event.headers || {})['x-mileage-pin'] || '') !== PIN) return json(401, { error: 'Wrong PIN' });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  if (!b.data || !/^image\/(jpeg|png|webp|gif)$/.test(b.type || '')) return json(400, { error: 'Send one JPEG/PNG image' });
  const year = new Date().getFullYear();
  const prompt = 'This is a diary or calendar page (photo or screenshot) belonging to a lettings manager in south-east London. '
    + 'List EVERY appointment you can see. Output ONLY a markdown table with exactly these columns and nothing else:\n'
    + '| Date | Time | Property | Type |\n|---|---|---|---|\n'
    + 'Rules: Date as "DD Mon YYYY" (if the year is not shown use ' + year + '). Time as HH:MM 24-hour, or HH:MM-HH:MM if an end time is shown. '
    + 'Property = the full address including postcode exactly as written (leave blank if no address). Type = viewing, valuation, inspection, maintenance, check-in, check-out, meeting, call etc. '
    + 'Include calls, meetings and personal items too (with a blank Property) – do not invent addresses. One row per appointment.';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.MILEAGE_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 2500,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: b.type, data: b.data } }, { type: 'text', text: prompt }] }] })
    });
    const d = await r.json();
    if (!r.ok) return json(502, { error: (d.error && d.error.message) || ('AI error ' + r.status) });
    return json(200, { text: ((d.content || [])[0] || {}).text || '' });
  } catch (e) { return json(502, { error: 'Could not reach the AI service – please try again' }); }
};
