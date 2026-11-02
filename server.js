'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { runSmokeTest } = require('./lib/runner');

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config', 'apps.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_HISTORY = 50;
const history = [];

const loadConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).applications;
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (c) => { data += c; if (data.length > 1e5) req.destroy(); });
  req.on('end', () => resolve(data));
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');

    if (req.method === 'GET' && pathname === '/api/apps') {
      // Config is re-read each time, so edits show up without a restart.
      return send(res, 200, loadConfig().map((a) => ({
        id: a.id, name: a.name, environments: Object.keys(a.environments),
      })));
    }
    if (req.method === 'GET' && pathname === '/api/history') return send(res, 200, history);

    if (req.method === 'POST' && pathname === '/api/run') {
      const { app: appId, env } = JSON.parse((await readBody(req)) || '{}');
      const app = loadConfig().find((a) => a.id === appId);
      if (!app) return send(res, 404, { error: `Unknown application "${appId}"` });
      if (!app.environments[env]) return send(res, 400, { error: `Unknown environment "${env}"` });
      const result = await runSmokeTest(app, env);
      history.unshift(result);
      history.length = Math.min(history.length, MAX_HISTORY);
      return send(res, 200, result);
    }

    if (req.method === 'GET') {
      const file = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
        return send(res, 200, fs.readFileSync(file), types[path.extname(file)] || 'text/plain');
      }
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Smoke test portal running at http://localhost:${PORT}`));
}
module.exports = server;
