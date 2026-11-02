'use strict';
const assert = require('assert');
const http = require('http');
const { runSmokeTest } = require('../lib/runner');

const target = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok'); }
  else if (req.url === '/slow') { setTimeout(() => res.end('late'), 300); }
  else { res.writeHead(500); res.end('boom'); }
});

target.listen(0, async () => {
  const baseUrl = `http://127.0.0.1:${target.address().port}`;
  const app = (checks) => ({ id: 't', name: 'T', environments: { dev: { baseUrl } }, checks });
  try {
    let r = await runSmokeTest(app([{ name: 'health', path: '/health', expectBodyContains: 'ok' }]), 'dev');
    assert.strictEqual(r.passed, true, 'healthy check should pass');

    r = await runSmokeTest(app([{ name: 'broken', path: '/broken' }]), 'dev');
    assert.strictEqual(r.passed, false);
    assert.match(r.checks[0].error, /expected status 200, got 500/);

    r = await runSmokeTest(app([{ name: 'slow', path: '/slow', maxMs: 50 }]), 'dev');
    assert.strictEqual(r.passed, false);
    assert.match(r.checks[0].error, /too slow/);

    r = await runSmokeTest(app([{ name: 'x', path: '/health' }]), 'dev', { timeoutMs: 1 }).catch((e) => e);
    await assert.rejects(runSmokeTest(app([]), 'nope'), /Unknown environment/);
    console.log('All tests passed');
  } catch (e) { console.error(e); process.exitCode = 1; }
  target.close();
});
