// Dionne's Mileage Tracker – database access (only the "mileage" part of the database).
// Netlify site settings → Environment variables needed: FIREBASE_URL, FIREBASE_SECRET, MILEAGE_PIN
exports.handler = async function (event) {
  const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });
  const FB = process.env.FIREBASE_URL, SECRET = process.env.FIREBASE_SECRET, PIN = process.env.MILEAGE_PIN;
  if (!FB || !SECRET || !PIN) return json(500, { error: 'Site settings missing (FIREBASE_URL, FIREBASE_SECRET, MILEAGE_PIN)' });
  const h = event.headers || {};
  if ((h['x-mileage-pin'] || '') !== PIN) return json(401, { error: 'Wrong PIN' });
  const path = String((event.queryStringParameters || {}).path || '');
  if (!/^mileage(\/[A-Za-z0-9_\-]{1,80})?$/.test(path)) return json(400, { error: 'Bad path' });
  const method = event.httpMethod;
  if (!['GET', 'PUT', 'DELETE'].includes(method)) return json(405, { error: 'Not allowed' });
  if (method !== 'GET' && path === 'mileage') return json(400, { error: 'Not allowed on the whole log' });
  try {
    const r = await fetch(FB.replace(/\/$/, '') + '/' + path + '.json?auth=' + SECRET, {
      method, headers: { 'Content-Type': 'application/json' }, body: method === 'PUT' ? event.body : undefined });
    const text = await r.text();
    return { statusCode: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: text || 'null' };
  } catch (e) { return json(502, { error: 'Database unreachable' }); }
};
