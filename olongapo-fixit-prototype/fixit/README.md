# Olongapo FixIt

Node.js (>=22.5, no runtime dependencies) + SQLite. Auth, access control and the AI check all run on the server.

## Run
    npm start            # http://localhost:3000  (PORT and DB_FILE env vars supported)

Set NODE_ENV=production behind HTTPS to get Secure cookies.

## Project layout
    server.js            HTTP server, static files, image route
    src/config.js        categories, statuses, keyword lists
    src/db.js            SQLite schema + query helpers, logs, notifications
    src/security.js      passwords, sessions, validation, permission checks
    src/ai.js            rule-based AI verification (swap in a vision model here)
    src/reports.js       report creation, status changes, role-scoped queries
    src/seed.js          demo data (created on first start)
    src/routes.js        all API endpoints
    public/index.html    page shell
    public/css/style.css styles
    public/js/           core.js, public.js, reports.js, admin.js, app.js
    test.js / ui.test.js API tests / browser-style page tests (npm i, then npm run test:ui)

## Demo accounts (remove before real use)
admin@fixit.ph/admin123 · captain@fixit.ph/demo123 · secretary@fixit.ph/demo123 · engineer@fixit.ph/demo123 · resident@fixit.ph/demo123
