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
  - [ ] **URGENT**: Remove debug logs from `integrations/core/api-coordinator.ts` that log credential objects
- Client data minimization
  - [ ] In `services/notificationService.ts`, stop sending `platform.credentials` to notification registration; send only a device/user ID and platform IDs.
- Mobile security hardening
  - [ ] Add biometric authentication for credential access (Face ID/Touch ID)
  - [ ] Implement app backgrounding protection (hide sensitive screens in task switcher)
  - [ ] Add deep linking validation to prevent credential exposure via URL schemes
- Operational guardrails
  - [ ] Reduce rate limit thresholds per-IP and add per-user limits on sensitive endpoints.
  - [ ] Set body size limits on all JSON parsers across server/serverless.

### Milestone 1: Identity and persistence (weeks 1–3)
- Database setup
  - [ ] **Consider**: Start with Redis + minimal SQLite server-side before full Postgres (simpler for mobile-first use case)
  - [ ] Schemas: `users`, `devices`, `platform_connections` (hashed identifiers only), `notification_preferences`, `push_tokens`, `events/audit`.
- Authentication & authorization
  - [ ] **Alternative to JWT**: Consider simpler device API keys for mobile use case (less overhead, better offline support)
  - [ ] Register device + associate push token; rotate/revoke on demand.
  - [ ] Map platform connections without storing raw credentials server-side.
- API refactor
  - [ ] Update `api/notifications/register` to require auth and persist tokens/preferences.
  - [ ] Add input validation (zod/yup) and consistent error envelopes.
- Canvas token security improvements
  - [ ] Implement Canvas token refresh flow (current tokens don't expire)
  - [ ] Add token rotation schedule and validation

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
- **CRITICAL**: Current Canvas tokens are long-lived and don't rotate - implement token lifecycle management.

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

## Task checklist (initial cut) - PRIORITIZED
### 🔥 CRITICAL (Days 1-3)
- [ ] **URGENT**: Remove debug logging from `integrations/core/api-coordinator.ts` (logs credential objects)
- [ ] Lock CORS to trusted origins in deployed Vercel functions
- [ ] Add log scrubbing middleware; remove request body and token logs from all API endpoints
- [ ] Remove credentials from `NotificationService.updateDeviceToken` payload; send device ID only

### 📱 MOBILE HARDENING (Days 4-7)  
- [ ] Add biometric authentication for credential access
- [ ] Implement app backgrounding protection
- [ ] Canvas token lifecycle management (refresh/rotation)

### 🏗️ INFRASTRUCTURE (Weeks 2-4)
- [ ] Add auth middleware for Vercel serverless functions 
- [ ] Introduce lightweight persistence (Redis or minimal DB)
- [ ] Implement device registration and API key system
- [ ] Add session cache with TTL for Gradescope

### 🔧 ADVANCED (Weeks 3-6)
- [ ] Add queue workers and backoff for Gradescope requests
- [ ] Build durable notifications worker with idempotency and DLQ
- [ ] Add metrics/tracing and load tests; define SLOs and alerts

---

## Notes on rollout
- **CHANGED**: Ship critical logging fixes immediately (no PR needed for security)
- Ship remaining Milestone 0 as fast PR to reduce exposure
- **UPDATED**: Milestone 1 can start simpler (device API keys vs JWT, Redis vs full DB)
- Milestone 2/3 can ship incrementally (session cache first, then queue/backoff; basic notifications then idempotency & DLQ)

## Architecture Notes Post-Refactor
- ✅ **COMPLETED**: Enterprise platform organization in `integrations/` 
- ✅ **COMPLETED**: Clean separation between Canvas (direct API) and Gradescope (serverless functions)
- ✅ **COMPLETED**: Removed 14k+ lines of unused/legacy code
- 🎯 **FOUNDATION READY**: Clean architecture enables systematic security improvements

## References (code) - UPDATED POST-REFACTOR
- Client secure storage and persistence: `store/useAppStore.ts`
- Notification registration (client): `services/notificationService.ts`
- Database service: `services/databaseService.ts`
- **NEW**: Enterprise API architecture: `integrations/core/api-coordinator.ts`
- Canvas API client: `integrations/canvas/client.ts`
- Gradescope API client: `integrations/gradescope/client.ts`
- Data transformation: `integrations/core/data-normalizers.ts`
- Type definitions: `integrations/*/types.ts`, `integrations/core/normalized-types.ts`
- Serverless endpoints: Deployed Vercel functions (see current API calls in gradescope client)


