# Airbnb Guest Book — TODO

Current version: **0.6.4** (per CHANGELOG)  
Last updated: 2026-05-25

---

## 🔴 Critical Bugs / Blockers

- [ ] **Undefined `storage` variable in `src/server.ts`** — `multer` is configured with `const upload = multer({ storage, ... })` but `storage` is never defined in the TypeScript file (unlike the legacy `server.js`). This will crash on startup.
- [ ] **`scripts/backup.js` vs `scripts/backup.ts` mismatch** — `package.json` runs `ts-node scripts/backup.ts` but only `backup.js` exists. Backup script will fail.
- [ ] **Duplicate server files** — Both `server.js` (root, CommonJS) and `src/server.ts` (TypeScript) exist. `package.json` starts `dist/server.js` (compiled from TypeScript), but the legacy root `server.js` causes confusion and diverged behavior (different auth strategy, missing check-in/out fields, `/submit` route vs `/api/entries`). Root `server.js` should be removed.
- [ ] **Auth middleware inconsistency** — `middleware/auth.js` reads token from `req.cookies.token`, but `src/server.ts`'s inline auth middleware reads it from `Authorization: Bearer` header. These need to be unified.
- [ ] **`package.json` version is `0.1.0`** but CHANGELOG reflects `0.6.4`. Version should be updated.

---

## 🟠 Security Issues

- [ ] **`csurf` package is deprecated** — It has known security vulnerabilities and is no longer maintained. Replace with a maintained CSRF library (e.g., `csrf-csrf` or move to `SameSite` cookie strategy).
- [ ] **JWT secret falls back to `'secret'`** in `src/server.ts` — If `JWT_SECRET` env var is not set, a trivially guessable secret is used. This should throw/fail at startup instead of silently accepting a weak default.
- [ ] **No authentication on backup/restore endpoints** — `POST /api/backup` and `POST /api/restore/:filename` are unprotected in both server files. Anyone can trigger a backup or restore.
- [ ] **Path traversal risk in restore endpoint** — `req.params.filename` is joined directly to the backups path. A `../` payload could escape the backup directory. Validate/sanitize the filename before using it.
- [ ] **`multer` file upload in `server.js` has no MIME validation** — The root `server.js` upload handler lacks the `fileFilter` present in `src/server.ts`.
- [ ] **Host password stored as plaintext comparison in `src/server.ts`** — `password === process.env.HOST_PASSWORD` compares in plaintext. The original `server.js` used `bcrypt.compare`. Restore bcrypt hashing in the TypeScript version.

---

## 🟡 Monitoring & Logging (In Progress per README)

- [ ] Add structured application logging with a library like **Winston** or **Pino** (replace `console.error`/`console.log` calls)
- [ ] Add a **/health** endpoint returning server status, uptime, and DB connection state
- [ ] Add audit logging for authentication events (login success/failure, token use)
- [ ] Add error tracking integration (e.g., Sentry)
- [ ] Add basic performance monitoring (request duration, slow query detection)

---

## 🟡 CI/CD Pipeline

- [ ] Add **GitHub Actions** workflow for CI: run `npm test` and `npm run build` on every push/PR
- [ ] Add automated Docker image build and publish to a container registry (e.g., GitHub Container Registry)
- [ ] Add dependency vulnerability scanning (e.g., `npm audit` or Dependabot)
- [ ] Add deployment automation (e.g., deploy on merge to `main`)
- [ ] Set up semantic versioning and automated changelog generation

---

## 🟡 Testing Improvements

- [ ] Fix existing test file — `server.test.ts` tests `/submit` (a route only in `server.js`), not the TypeScript server's `/api/entries`
- [ ] Add unit tests for sanitization middleware
- [ ] Add unit tests for auth middleware
- [ ] Add integration tests for all API endpoints (entries CRUD, login, backup)
- [ ] Add test coverage thresholds (aim for ≥80%)
- [ ] Add E2E tests (e.g., Playwright or Cypress) for guest form submission flow
- [ ] Set up a MongoDB in-memory server (e.g., `mongodb-memory-server`) for test isolation

---

## 🟡 Performance Optimization

- [ ] Add database indexes on `Entry` schema (e.g., `date`, `name`) to speed up search and sort
- [ ] Add pagination to `GET /api/entries` (currently returns all entries with no limit)
- [ ] Add response caching for the entries list (e.g., short TTL in-memory cache or Redis)
- [ ] Add image optimization/resizing on upload (e.g., `sharp`)
- [ ] Add per-user API rate limiting (current rate limiter is IP-only)

---

## 🟡 Code Quality & Maintenance

- [ ] Add **ESLint** with a TypeScript-compatible config (`@typescript-eslint`)
- [ ] Add **Prettier** for consistent code formatting
- [ ] Add **Git hooks** (via Husky + lint-staged) to run lint/format on commit
- [ ] Enable TypeScript `strict` mode checks that are currently bypassed (e.g., explicit return types)
- [ ] Remove unused `errorHandler` constant in `src/server.ts` (defined but overshadowed by the anonymous error handler below it)
- [ ] Add missing TypeScript types for `cookie-parser`, `multer`, `bcryptjs`, and `nodemailer` to devDependencies

---

## 🟡 Analytics & Reporting

- [ ] Build a host dashboard showing total stays, total guests, repeat guest rate, and occupancy by month
- [ ] Calculate total booked days from check-in/check-out data (groundwork already in schema)
- [ ] Add CSV/JSON export of guest entries for the host
- [ ] Add entry statistics endpoint (average stay duration, most common origin cities)

---

## 🟢 Accessibility

- [ ] Add ARIA labels to all form inputs and interactive elements
- [ ] Ensure full keyboard navigation (tab order, focus indicators)
- [ ] Add `lang` attribute to `<html>` in both HTML pages
- [ ] Validate color contrast ratios for both light and dark modes
- [ ] Add screen reader-friendly status messages for form submission

---

## 🟢 API Improvements

- [ ] Add **OpenAPI/Swagger** documentation (auto-generated from route definitions)
- [ ] Add API versioning (e.g., `/api/v1/entries`)
- [ ] Standardize error response format across all endpoints
- [ ] Add `GET /api/entries/search` to `src/server.ts` (exists in `server.js` but missing in the TypeScript version)

---

## 🟢 Internationalization

- [ ] Add language selection UI
- [ ] Set up a translation system (e.g., `i18next`)
- [ ] Add RTL layout support
- [ ] Localize date/time display based on user locale

---

## 🟢 Infrastructure & DevOps

- [ ] Add a backup rotation policy (delete backups older than N days)
- [ ] Add infrastructure-as-code (e.g., Terraform or Pulumi) for cloud deployment
- [ ] Document disaster recovery process in `docs/`
- [ ] Add container health check to `Dockerfile` (e.g., `HEALTHCHECK` instruction)

---

## 🟢 User Experience

- [ ] Add rich text editor for the comments field
- [ ] Add image gallery view on the entries page
- [ ] Add email notification templates (currently uses plain text)
- [ ] Add a host login UI page (currently login is API-only)
- [ ] Add confirmation before deleting an entry

---

## Notes

**Priority order suggestion:** Red → Orange → Yellow (Monitoring/CI/Testing first) → remaining Yellows → Greens  
**Current status summary:** Core features are functional. The immediate blockers (storage variable, backup script mismatch, deprecated csurf, unprotected backup endpoints) should be addressed before the next release.
