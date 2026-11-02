'use strict';
// Runs the smoke-test checks for one application + environment.

async function runCheck(baseUrl, check, timeoutMs) {
  const url = baseUrl.replace(/\/+$/, '') + check.path;
  const method = check.method || 'GET';
  const expectStatus = check.expectStatus || 200;
  const started = Date.now();
  const result = { name: check.name, method, url, expectStatus };
  try {
    const res = await fetch(url, {
      method,
      headers: check.headers || {},
      body: check.body ? JSON.stringify(check.body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    result.durationMs = Date.now() - started;
    result.status = res.status;
    const problems = [];
    if (res.status !== expectStatus) problems.push(`expected status ${expectStatus}, got ${res.status}`);
    if (check.expectBodyContains && !text.includes(check.expectBodyContains))
      problems.push(`body missing "${check.expectBodyContains}"`);
    if (check.maxMs && result.durationMs > check.maxMs)
      problems.push(`too slow: ${result.durationMs}ms > ${check.maxMs}ms`);
    result.passed = problems.length === 0;
    if (problems.length) result.error = problems.join('; ');
  } catch (err) {
    result.durationMs = Date.now() - started;
    result.passed = false;
    result.error = err.name === 'TimeoutError' ? `timed out after ${timeoutMs}ms` : err.message;
  }
  return result;
}

async function runSmokeTest(app, envName, { timeoutMs = 10000 } = {}) {
  const env = app.environments[envName];
  if (!env) throw new Error(`Unknown environment "${envName}" for ${app.name}`);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const checks = await Promise.all(app.checks.map((c) => runCheck(env.baseUrl, c, timeoutMs)));
  return {
    app: app.id,
    appName: app.name,
    env: envName,
    baseUrl: env.baseUrl,
    startedAt,
    durationMs: Date.now() - t0,
    passed: checks.every((c) => c.passed),
    checks,
  };
}

module.exports = { runSmokeTest, runCheck };
