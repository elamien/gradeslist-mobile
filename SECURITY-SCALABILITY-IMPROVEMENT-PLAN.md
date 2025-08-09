## Security & Scalability Improvement Plan

### Executive summary
The mobile app is architecturally solid for device-side use (SecureStore for secrets, SQLite cache, offline-first). However, server and integration layers (open serverless endpoints, password-based Gradescope scraping, no DB, verbose logs) are not production-ready for thousands of users. This plan prioritizes endpoint hardening, secret/log hygiene, identity + persistence, GradeScope integration stability, and a durable notifications pipeline.

---

## Current state snapshot
- **Mobile**
  - Secrets: `expo-secure-store` for credentials; UI/data cache in SQLite via `services/databaseService.ts`.
  - Integrations: Canvas via bearer token; Gradescope via WebView proxy or server login/scrape.
  - Notifications: Expo registration, sends payload to `api/notifications/register`.
- **Server/serverless**
  - Express app with `helmet`, CORS, and basic IP rate-limit (`server/server.js`).
  - Vercel functions: `api/gradescope/*`, `api/notifications/register`. No auth; CORS `*`.
  - No persistent DB for users/devices/tokens. Cron and notifications use mock or in-memory state.
  - Logs can include sensitive inputs (push tokens, request bodies).

## Key risks and gaps
- Open endpoints with permissive CORS, no auth or tenant isolation.
- Sensitive data in logs (push tokens, request bodies, potential credentials on errors).
- Notification registration sends full platform credentials (unnecessary exposure).
- Gradescope scraping with email/password per request; no durable session cache, no queue/backoff; high risk of rate limits/blocks and brittleness.
- No DB for user/device identity, push tokens, preferences, sessions, or audit.
- Cron/notifications pipeline is non-durable and demo-only.

## Objectives
- Enforce authenticated, least-privilege, rate-aware server endpoints.
- Keep credentials on-device; never transmit platform passwords where not strictly required.
- Centralize identity and preferences in a durable store.
- Make Gradescope access reliable, rate-limited, and cache-aware (or shift fully to on-device session usage).
- Ship production-grade notifications with queues, retries, and observability.

---

## Phased roadmap

### Milestone 0: Immediate quick wins (days 1–5)
- Endpoint/CORS hardening
  - [ ] Restrict CORS in production to trusted origins only in `server/server.js` and serverless handlers.
  - [ ] Add auth guard to `api/notifications/register` and Gradescope server routes.
- Secrets/logging hygiene
  - [ ] Never log request bodies; redact `Authorization`, passwords, cookies, push tokens in all logs.
  - [ ] Replace `console.log` of push tokens with hashed/truncated identifiers.
  - [ ] Add centralized error middleware that scrubs PII before logging.
- Client data minimization
  - [ ] In `services/notificationService.ts`, stop sending `platform.credentials` to notification registration; send only a device/user ID and platform IDs.
- Operational guardrails
  - [ ] Reduce rate limit thresholds per-IP and add per-user limits on sensitive endpoints.
  - [ ] Set body size limits on all JSON parsers across server/serverless.

### Milestone 1: Identity and persistence (weeks 1–3)
- Database setup
  - [ ] Stand up Postgres (or Supabase/Neon) with migrations.
  - [ ] Schemas: `users`, `devices`, `platform_connections` (hashed identifiers only), `notification_preferences`, `push_tokens`, `events/audit`.
- Authentication & authorization
  - [ ] Introduce device-bound JWT auth for API calls; short-lived tokens signed by server secret.
  - [ ] Register device + associate push token; rotate/revoke on demand.
  - [ ] Map platform connections without storing raw credentials server-side.
- API refactor
  - [ ] Update `api/notifications/register` to require JWT and persist tokens/preferences.
  - [ ] Add input validation (zod/yup) and consistent error envelopes.

### Milestone 2: Gradescope integration hardening (weeks 2–5)
- Prefer on-device session (WebView proxy)
  - [ ] Use `components/GradescopeLogin.tsx` to establish session; avoid transmitting credentials to backend.
  - [ ] Expose minimal on-device calls for course/assignment fetches where feasible.
- If server-side is required
  - [ ] Add Redis for session cookie cache per user with TTL/refresh; avoid re-login per request.
  - [ ] Implement concurrency limits, exponential backoff, and request queue (BullMQ/Cloud Tasks).
  - [ ] Rotate egress IPs if needed; detect upstream changes; add robust HTML parsing with tests.
  - [ ] Instrument upstream response time/error rates; circuit-break on failures.
- Compliance/ToS
  - [ ] Engage with Gradescope or institutions for sanctioned API/approach. Document ToS posture.

### Milestone 3: Notifications at scale (weeks 3–6)
- Durable pipeline
  - [ ] Store user/course selection and last-seen assignment snapshots in DB.
  - [ ] Worker(s) to poll providers (or consume webhooks if available), diff results, and enqueue push events.
  - [ ] Idempotency keys to prevent duplicate notifications; per-user backoff.
  - [ ] Fan-out to Expo with retry policies and DLQ for failures.
- Preferences and UX
  - [ ] Per-user notification categories and quiet hours; opt-in/out toggles.
  - [ ] In-app notification inbox/history (optional).

### Milestone 4: Observability and readiness (ongoing)
- [ ] Structured logging (no PII) and centralized log storage.
- [ ] Metrics: latency, error rates, rate-limit hit counts, notification success rates.
- [ ] Tracing across mobile → API → worker path.
- [ ] Load testing and chaos testing; SLOs and alerts.

---

## Detailed workstreams

### 1) Endpoint security
- Replace permissive CORS with allowlist for production.
- Add JWT middleware to `api/notifications/register`, Gradescope server routes (`server/routes/gradescope.js`), and any new APIs.
- Validate payloads; enforce JSON size limits.

### 2) Secrets and logging
- Redact sensitive fields globally; remove raw device push token logs.
- Prevent logs from including request bodies; log only minimal metadata (method, path, status, timing, hashed IDs).
- Store server secrets in managed secret store; rotate periodically.

### 3) Persistence & identity
- Model: `User` (or anonymous per-device identity), `Device`, `PushToken`, `NotificationPreference`, `PlatformConnection`.
- Never persist platform passwords on server; store hashed identifiers only.
- Add audit/event tables for important actions.

### 4) Gradescope integration
- On-device-first via WebView session; keep credentials on device.
- If server scraping persists: session cache (Redis), queue + backoff, parsing tests, rate limits, monitoring, and IP rotation strategy.

### 5) Canvas auth improvements
- Add OAuth 2.0 PKCE/device-code option to replace manual token entry; manage token refresh on-device.

### 6) Notifications architecture
- Durable DB-backed state; compute deltas vs last snapshot.
- Queue workers for polling/fan-out; Expo push integration with retries and DLQ.
- Preference-driven routing and batching.

### 7) Compliance & privacy
- FERPA awareness: avoid storing grades/PII server-side; keep data processing minimal.
- Data minimization: send only IDs and non-sensitive metadata to backend services.
- Add a data retention policy and user deletion/export endpoints.

---

## Acceptance criteria & KPIs
- Security
  - [ ] All public APIs require JWT; CORS restricted in prod; inputs validated; secrets not logged.
  - [ ] Credentials never transmitted to endpoints that don’t require them; server never stores raw platform passwords.
- Reliability
  - [ ] P50/P95 latencies under defined SLOs; error rate < 1% on steady load.
  - [ ] Gradescope requests rate-limited with < 0.5% upstream block errors; session reuse > 80%.
- Notifications
  - [ ] 99% push delivery success within 60s; duplicate rate < 0.1%.
- Observability
  - [ ] Dashboards for latency, errors, rate-limits; alerting configured.

---

## Task checklist (initial cut)
- [ ] Lock CORS to trusted origins in `server/server.js` and serverless routes
- [ ] Add JWT auth middleware for `api/notifications/register` and Gradescope routes
- [ ] Remove credentials from `NotificationService.updateDeviceToken` payload; send device ID only
- [ ] Add log scrubbing middleware; remove request body and token logs
- [ ] Introduce Postgres + migrations; implement `users`, `devices`, `push_tokens`, `preferences`, `platform_connections`
- [ ] Implement device-bound JWT issuance/rotation
- [ ] Add Redis; implement session cache with TTL for Gradescope
- [ ] Add queue workers and backoff for Gradescope requests
- [ ] Build durable notifications worker with idempotency and DLQ
- [ ] Add metrics/tracing and load tests; define SLOs and alerts

---

## Notes on rollout
- Ship Milestone 0 as a fast PR to reduce exposure.
- Milestone 1 introduces DB and JWT; plan a small migration and release feature flags.
- Milestone 2/3 can ship incrementally (session cache first, then queue/backoff; basic notifications then idempotency & DLQ).

## References (code)
- Client secure storage and partial persistence: `store/useAppStore.ts`
- Notification registration (client): `services/notificationService.ts`
- Server baseline: `server/server.js`
- Serverless notifications route: `api/notifications/register.js`
- Gradescope flows: `integrations/mobile-gradescope-api-real.ts`, `api-extraction/gradescope-api.ts`, `server/routes/gradescope.js`


