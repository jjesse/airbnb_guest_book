# Airbnb Guest Book — TODO

Current version: **0.6.4** (per CHANGELOG)  
Last updated: 2026-05-25

---

## 🔴 Critical Bugs / Blockers

- [x] **Undefined `storage` variable in `src/server.ts`** — Added `multer.diskStorage` configuration; `upload` now has a properly defined storage backend.
- [x] **`scripts/backup.js` vs `scripts/backup.ts` mismatch** — Created `scripts/backup.ts`; `npm run backup` now works.
- [x] **Duplicate server files** — Removed legacy root `server.js`; `src/server.ts` is the single source of truth. Updated `package.json` `main` to `dist/server.js`.
- [x] **Auth middleware inconsistency** — Removed `middleware/auth.js` (cookie-based); `src/server.ts` uses a single consistent inline auth middleware (******
- [x] **`package.json` version is `0.1.0`** — Updated to `0.6.4` to match CHANGELOG.
- [x] **Missing required fields in `POST /api/entries`** — Route now accepts `checkIn`, `checkOut`, and `isRepeatGuest` as required by the schema (saves were failing silently).
- [x] **Misplaced error handler** — Removed the anonymous 4-argument error handler placed before routes (it could never catch route errors). Consolidated into single `errorHandler` after routes.
- [x] **Missing routes in TypeScript server** — Added search, photo upload, CSRF token, and backup/restore endpoints (previously only existed in the deleted `server.js`).
- [x] **JWT secret silent fallback** — Added startup validation: throws in production if `JWT_SECRET` is unset, warns in development.
- [x] **`dotenv` missing from `dependencies`** — Added `dotenv` to `dependencies`; also added `@types/multer`, `@types/cookie-parser`, `@types/bcryptjs` to `devDependencies`.

---

## 🟠 Security Issues

- [x] **`csurf` package is deprecated** — Replaced with `csrf-csrf` double-submit-cookie protection and kept the `/api/csrf-token` endpoint for the UI.
- [x] **JWT secret falls back to `'secret'`** in `src/server.ts` — Startup now warns in development and throws in production when `JWT_SECRET` is unset.
- [x] **No authentication on backup/restore endpoints** — `POST /api/backup` and `POST /api/restore/:filename` now require auth.
- [x] **Path traversal risk in restore endpoint** — Restore filenames are validated before path usage.
- [x] **`multer` file upload in `server.js` has no MIME validation** — Legacy `server.js` was removed; the active TypeScript server validates MIME type and size.
- [x] **Host password stored as plaintext comparison in `src/server.ts`** — Login now uses `bcrypt.compare` against the hashed env var.

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

- [x] Build a host dashboard showing total stays, total guests, repeat guest rate, and occupancy by month
- [x] Calculate total booked days from check-in/check-out data (groundwork already in schema)
- [x] Add CSV/JSON export of guest entries for the host
- [x] Add entry statistics endpoint (average stay duration, most common origin cities)

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
