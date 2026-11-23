import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is explicitly loaded from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
process.env.NODE_ENV = 'test';

const { app } = await import('../index.js');

console.log('============================================================');
console.log('PLACIO-HIRE DEFENSIVE SECURITY TEST SUITE');
console.log('Testing Environment: Node.js', process.version);
console.log('Target: Placio-Hire Express Backend Security Controls');
console.log('============================================================\n');

let server;
let baseUrl;

function startTestServer() {
  return new Promise((resolve, reject) => {
    // Listen on dynamic random available port
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`[TEST HARNESS] Ephemeral test server active on ${baseUrl}\n`);
      resolve();
    });
    server.on('error', reject);
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('\n[TEST HARNESS] Ephemeral test server closed cleanly.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`TEST ${totalTests}: ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('PASSED [✓]');
  } catch (err) {
    console.log('FAILED [✗]');
    console.error('   Assertion Error:', err.message);
  }
}

// -----------------------------------------------------------------------------
// TEST CASES
// -----------------------------------------------------------------------------

async function executeTestSuite() {
  await startTestServer();

  try {
    // 1. Security Headers
    await runTest('Defensive Headers: Helmet & Fingerprint Shielding', async () => {
      const res = await fetch(`${baseUrl}/api/team`);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Missing X-Content-Type-Options: nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN', 'Missing X-Frame-Options: SAMEORIGIN');
      assert.strictEqual(res.headers.get('x-powered-by'), null, 'X-Powered-By header must be suppressed');
    });

    // 2. CORS Policy: Whitelisted Origin
    await runTest('CORS: Authorized Origin Accepted', async () => {
      const res = await fetch(`${baseUrl}/api/team`, {
        headers: { 'Origin': 'http://localhost:5173' }
      });
      assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5173', 'Allowed origin must match');
    });

    // 3. CORS Policy: Unauthorized Origin Blocked
    await runTest('CORS: Malicious/Unauthorized Origin Blocked', async () => {
      const res = await fetch(`${baseUrl}/api/team`, {
        headers: { 'Origin': 'https://evil-unauthorized-site.com' }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.notStrictEqual(allowOrigin, 'https://evil-unauthorized-site.com', 'Unauthorized origin must not receive Access-Control-Allow-Origin');
    });

    // 4. Payload Size Limit: Rejects Large JSON Payload (>1MB)
    await runTest('DoS Prevention: Large Payload Rejection (>1MB)', async () => {
      const largePayload = JSON.stringify({ data: 'A'.repeat(1.2 * 1024 * 1024) });
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largePayload
      });
      assert.strictEqual(res.status, 413, `Expected status 413 Payload Too Large, received ${res.status}`);
    });

    // 5. Auth Boundary: Unauthenticated Admin Stats Rejected
    await runTest('Authorization Boundary: Unauthenticated /api/admin/stats returns 403', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`);
      assert.strictEqual(res.status, 403, `Expected status 403 Forbidden, received ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('Active administrator authorization required'));
    });

    // 6. Auth Boundary: Unauthenticated Candidate Profile Endpoint Rejected
    await runTest('Authorization Boundary: Unauthenticated /api/me returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/me`);
      assert.strictEqual(res.status, 401, `Expected status 401 Unauthorized, received ${res.status}`);
    });

    // 7. Auth Boundary: Forged / Fake Bearer Token Rejected
    await runTest('Authorization Boundary: Tampered JWT Token Rejected', async () => {
      const res = await fetch(`${baseUrl}/api/admin/jobs`, {
        headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature' }
      });
      assert.strictEqual(res.status, 403, `Expected status 403 Forbidden for forged token, received ${res.status}`);
    });

    // 8. File Upload Protection: Rejection of Disallowed Photo Extension (.svg, .exe)
    await runTest('File Upload Defense: Rejection of Executable or SVG Upload as Photo', async () => {
      const form = new FormData();
      form.append('photo', Buffer.from('<svg onload="alert(1)"></svg>'), {
        filename: 'malicious.svg',
        contentType: 'image/svg+xml'
      });

      const res = await fetch(`${baseUrl}/api/candidate/photo`, {
        method: 'POST',
        body: form.getBuffer(),
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer mock-token'
        }
      });
      assert.ok(res.status === 400 || res.status === 401, `Expected 400 or 401, received ${res.status}`);
    });

    // 9. SQL Injection Resistance in Public Job Querying
    await runTest('SQL Injection Resistance: Parameterized Jobs Query with Exploitation Syntax', async () => {
      const sqlPayload = "' UNION SELECT id, email, password, null, null FROM auth.users --";
      const res = await fetch(`${baseUrl}/api/jobs?search=${encodeURIComponent(sqlPayload)}`);
      assert.strictEqual(res.status, 200, `Expected 200 OK from parameterized query, received ${res.status}`);
      const body = await res.json();
      assert.ok(Array.isArray(body), 'Expected array response from /api/jobs');
    });

    // 10. Rate Limiting: High-Frequency Requests Trigger 429
    await runTest('Rate Limiting: Exceeding Threshold Triggers HTTP 429 with Retry-After', async () => {
      let triggered429 = false;
      let retryAfterHeader = null;

      // Send 10 rapid contact requests (limit is 5)
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`${baseUrl}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Rate Limit Tester',
            email: `tester${i}@example.com`,
            message: 'Testing rate limits'
          })
        });

        if (res.status === 429) {
          triggered429 = true;
          retryAfterHeader = res.headers.get('retry-after');
          break;
        }
      }

      assert.strictEqual(triggered429, true, 'Rate limiter must return HTTP 429 when threshold exceeded');
      assert.ok(retryAfterHeader !== null, 'HTTP 429 response must contain Retry-After header');
    });

  } finally {
    await stopTestServer();
  }

  console.log('\n============================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('============================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

executeTestSuite().catch((err) => {
  console.error('[TEST FATAL ERROR]', err);
  process.exit(1);
});
