// Dionne's Mileage Tracker – database access (only the "mileage" part of the database).
// Netlify site settings → Environment variables needed: FIREBASE_URL, FIREBASE_SECRET, MILEAGE_PIN

// Works on every Netlify Node version (no reliance on built-in fetch)
const https = require('https');
function req(url, opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(url, { method: opts.method || 'GET', headers: opts.headers || {} }, res => {
      let d = ''; res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, text: d }));
    });
    r.on('error', reject); r.setTimeout(25000, () => r.destroy(new Error('timed out')));
    if (body) r.write(body); r.end();
  });
}
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
  const base = String(FB).trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '').replace(/\.json$/, '');
  if (!/^https:\/\/[^\s]+$/.test(base)) return json(500, { error: 'FIREBASE_URL looks wrong – it should start with https:// (no quotes, no spaces)' });
  try {
    const r = await req(base + '/' + path + '.json?auth=' + encodeURIComponent(String(SECRET).trim()), { method, headers: { 'Content-Type': 'application/json' } }, method === 'PUT' ? event.body : null);
    if (r.status === 401) return json(502, { error: 'Database refused the key – check FIREBASE_SECRET matches the CRM site' });
    return { statusCode: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: r.text || 'null' };
  } catch (e) { return json(502, { error: 'Database unreachable: ' + e.message }); }
};
