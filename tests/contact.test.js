const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/contact.js');

const valid = {
  first_name: 'Taylor', last_name: 'Example', email: 'taylor@example.com',
  company: 'Example Team', service: 'Custom software',
  details: 'We need an internal operations dashboard.', contact_ok: true, website: '',
};

async function request(body, options = {}) {
  const response = {
    statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    end(value) { this.body = JSON.parse(value); },
  };
  await handler({
    method: options.method || 'POST',
    headers: { host: 'jygen.tech', origin: 'https://jygen.tech',
      'content-type': 'application/json', ...options.headers },
    body,
  }, response);
  return response;
}

test('rejects cross-site requests and incomplete inquiries', async () => {
  assert.equal((await request(valid, { headers: { origin: 'https://other.example' } })).statusCode, 403);
  assert.equal((await request({ ...valid, details: 'too short' })).statusCode, 422);
  assert.equal((await request({ ...valid, contact_ok: false })).statusCode, 422);
});

test('does not claim delivery before the server is configured', async () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  const response = await request(valid);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error, 'NOT_CONFIGURED');
});

test('submits a valid inquiry using only a server-side secret', async () => {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  const original = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://project.supabase.co/rest/v1/contact_inquiries');
    assert.equal(options.headers.apikey, 'sb_secret_test');
    assert.equal(JSON.parse(options.body).email, valid.email);
    assert.equal(JSON.parse(options.body).source, 'jygen.tech');
    return { ok: true, status: 201 };
  };
  try {
    const response = await request(valid);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
  } finally {
    global.fetch = original;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
  }
});
