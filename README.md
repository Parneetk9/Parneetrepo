# Smoke Test Portal

A small website your team can open, pick an **application** and **environment**, click **Run smoke test**, and see pass/fail per check.

No dependencies — just Node 18+.

```bash
npm start        # http://localhost:3000  (set PORT to change)
npm test         # runner unit tests
```

## Adding an application

Edit `config/apps.json` (no restart needed):

```json
{
  "id": "billing-api",
  "name": "Billing API",
  "environments": {
    "dev":  { "baseUrl": "https://billing.dev.example.com" },
    "prod": { "baseUrl": "https://billing.example.com" }
  },
  "checks": [
    { "name": "Health", "path": "/health", "expectStatus": 200, "maxMs": 2000 },
    { "name": "Login page", "path": "/login", "expectBodyContains": "Sign in" }
  ]
}
```

Check options: `path`, `method` (default GET), `headers`, `body`, `expectStatus` (default 200), `expectBodyContains`, `maxMs`.

## Sharing with the team

Deploy it anywhere that runs Node (Render, Fly, Azure App Service, an internal VM, a container). It must be able to reach the target environments over the network. The app has **no authentication** — put it behind your SSO/VPN/reverse proxy before exposing it.
