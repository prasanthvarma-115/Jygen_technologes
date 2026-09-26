/* Server-only contact endpoint. Deploy /api/contact with the JYGEN site. */
const SERVICES = new Set([
  'Custom software', 'Digital products', 'AI solutions', 'Workflow automation',
  'IoT and connected systems', 'SaaS platforms', 'Custom systems', 'Not sure yet',
]);

function respond(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  if (request.body !== undefined) {
    const value = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    if (Buffer.byteLength(value) > 12_000) throw new Error('TOO_LARGE');
    return JSON.parse(value);
  }
  let value = '';
  for await (const chunk of request) {
    value += chunk.toString();
    if (Buffer.byteLength(value) > 12_000) throw new Error('TOO_LARGE');
  }
  return JSON.parse(value);
}

module.exports = async function contact(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    respond(response, 405, { error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    respond(response, 415, { error: 'JSON_REQUIRED' });
    return;
  }
  try {
    const origin = request.headers.origin;
    if (origin && new URL(origin).host !== request.headers.host) {
      respond(response, 403, { error: 'INVALID_ORIGIN' });
      return;
    }
  } catch {
    respond(response, 403, { error: 'INVALID_ORIGIN' });
    return;
  }

  let input;
  try {
    input = await readBody(request);
  } catch (error) {
    respond(response, error.message === 'TOO_LARGE' ? 413 : 400,
      { error: error.message === 'TOO_LARGE' ? 'TOO_LARGE' : 'INVALID_JSON' });
    return;
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    respond(response, 400, { error: 'INVALID_INQUIRY' });
    return;
  }
  if (input.website) { // Hidden honeypot field: do not store automated submissions.
    respond(response, 200, { ok: true });
    return;
  }
  const field = (key) => typeof input[key] === 'string' ? input[key].trim() : '';
  const first_name = field('first_name');
  const last_name = field('last_name');
  const email = field('email');
  const company = field('company');
  const service = field('service');
  const details = field('details');
  if (!first_name || first_name.length > 90 || !last_name || last_name.length > 90 ||
      email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      company.length > 150 || !SERVICES.has(service) ||
      details.length < 10 || details.length > 5000 || input.contact_ok !== true) {
    respond(response, 422, { error: 'INVALID_INQUIRY' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !/^https:\/\//.test(url) || !key) {
    respond(response, 503, { error: 'NOT_CONFIGURED' });
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let stored;
    try {
      stored = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/contact_inquiries`, {
        method: 'POST',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ first_name, last_name, email, company, service,
          details, contact_ok: true, source: 'jygen.tech' }),
        signal: controller.signal,
      });
    } finally { clearTimeout(timer); }
    if (!stored.ok) {
      console.error('JYGEN inquiry storage failed with status', stored.status);
      respond(response, 502, { error: 'DELIVERY_FAILED' });
      return;
    }
    respond(response, 200, { ok: true });
  } catch (error) {
    console.error('JYGEN inquiry storage unavailable:', error.name);
    respond(response, 502, { error: 'DELIVERY_FAILED' });
  }
};
