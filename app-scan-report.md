# Application Scan Report

Scanned path: `C:\Users\ka3bo\Documents\copie\code express data`

## Checks Run

- Listed project files and structure.
- Ran JavaScript syntax checks:
  - `node --check` on `test express\serveur.js`
  - `node --check` on all files in `file\js`
- Searched for risky patterns: secrets, password handling, open CORS, dynamic HTML insertion, missing routes, external scripts.
- Ran `npm.cmd audit --omit=dev` in `test express`.

## Key Findings

### High: Server will fail if Socket.IO is required at runtime

`test express\serveur.js` imports `socket.io`, but `package.json` and `npm ls --depth=0` do not include it.

- `test express\serveur.js:19`
- `file\html\Salle 1.html:63`

Fix: install and save it with `npm install socket.io`, or remove the Socket.IO code/client script if it is not needed.

### High: No authorization on sensitive API routes

After `/api/auth`, the server does not issue a session/JWT/cookie, and routes such as user management, product management, receipt status, close-day, and table changes are callable directly.

Examples:

- `test express\serveur.js:149`
- `test express\serveur.js:181`
- `test express\serveur.js:208`
- `test express\serveur.js:788`
- `test express\serveur.js:1059`

Fix: add authentication middleware for manager-only/server-only routes and make `/api/auth` create a real session or token.

### High: Plaintext numeric passwords are stored and compared directly

Passwords/codes are inserted into and selected from the database as plaintext.

- `test express\serveur.js:111`
- `test express\serveur.js:120`
- `test express\serveur.js:169`
- `test express\serveur.js:250`

Fix: hash passwords/codes with a slow hash such as `bcrypt` or `argon2`, and compare hashes. Also avoid returning full inserted rows containing password fields.

### High: Passwords are logged to the console

Password update routes print the new password.

- `test express\serveur.js:187`
- `test express\serveur.js:266`

Fix: remove these logs immediately.

### High: Open CORS and Socket.IO wildcard origin

The app accepts requests from any origin.

- `test express\serveur.js:11`
- `test express\serveur.js:20`

Fix: restrict origins to your real frontend host, especially before deployment.

### High: `/api/change-table` can hang or corrupt transactions

The route starts a transaction, then starts another `BEGIN` inside the `else` branch. It also commits without sending a response, and it reads `result.rows[0]` / `resold.rows[0]` without checking that a row exists.

- `test express\serveur.js:1068`
- `test express\serveur.js:1088`
- `test express\serveur.js:1109`

Fix: use one transaction, check row counts before dereferencing, and return a JSON response after every successful branch.

### Medium: Missing upload endpoint

The frontend posts to `/api/upload`, but the server has no matching route.

- `file\js\script.js:414`

Fix: add an upload route, or remove/replace that frontend call.

### Medium: Broken static routes / typos

Routes point to files that do not exist:

- `test express\serveur.js:82` serves `coffe.svp`, but the project contains `coffe.svg`.
- `test express\serveur.js:90` serves `toaledejour.html`, but the file is `totaledejour.html`.

Fix: correct the extensions and spelling.

### Medium: Dependency audit found vulnerabilities

`npm audit --omit=dev` found 12 vulnerabilities:

- 6 high
- 6 moderate

Affected packages include `path-to-regexp`, `picomatch`, `qs`, and `brace-expansion`, mostly through `express`, `router`, and `nodemon`.

Fix: run `npm audit fix`, then review remaining no-fix items. Move `nodemon` to `devDependencies` if it is only for development.

### Medium: Public Supabase URL/key are embedded in frontend files

Frontend files expose the Supabase project URL and publishable key.

- `file\js\serveur.js:8`
- `file\js\totaledejour.js:6`

This can be acceptable only if the key is truly publishable and Row Level Security policies are correctly configured.

Fix: verify Supabase RLS policies. Prefer moving privileged database behavior behind the Express server.

### Medium: External CDN dependencies are loaded directly

Pages load Font Awesome, Chart.js, and Supabase client code from public CDNs.

- `file\html\statistique.html:5`
- `file\html\index.html:7`
- `file\js\serveur.js:1`

Fix: pin versions, add Subresource Integrity where possible, or bundle dependencies locally.

## Passed Checks

- Server JavaScript syntax check passed.
- Frontend JavaScript syntax checks passed.
- SQL queries generally use parameter placeholders, which reduces SQL injection risk.
- `.env` exists and contains expected config names: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`.

