# CLAUDE.md

Canonical guide for AI coding assistants working in this repository. The filename is historical; the content is tool-neutral and applies to any agent (Claude Code, Codex, Cursor, Aider, Continue, Gemini CLI, GitHub Copilot, etc.). `AGENTS.md` and `.github/copilot-instructions.md` are pointers to this file — keep edits here.

## Overview

MPS (Management Presence Server) provides cloud-side out-of-band manageability for Intel vPro® / Intel® AMT devices. Devices initiate a persistent TLS connection to MPS using **CIRA** (Client-Initiated Remote Access); MPS multiplexes that connection so REST callers can drive AMT (power control, KVM, SOL, IDE-R, audit/event logs, certificates, etc.) without the device being directly reachable. Sibling service: [RPS](https://github.com/device-management-toolkit/rps) — RPS activates devices, MPS manages them post-activation.

Two TCP servers run in the same process:

- **MPS server** (default port `4433`) — TLS, accepts CIRA from devices, speaks **APF** (AMT Port Forwarding) to tunnel WSMAN/KVM/SOL/IDER channels.
- **Web server** (default port `3000`) — HTTP, hosts the `/api/v1` REST surface and the `/relay/webrelay.ashx` WebSocket used by the Sample Web UI for KVM/SOL/IDER.

## Commands

- `npm start` — `npm run build` then `node ./dist/index.js`. MPS on `port` (default `4433`), web on `web_port` (default `3000`).
- `npm test` — Vitest run with coverage (`@vitest/coverage-v8`). `npm run test:watch` for interactive.
- Single test: `npx vitest run src/path/to/file.test.ts` (add `-t "name"` to filter by test name).
- `npm run lint` — ESLint over `**/*.ts`. `npm run prettify` / `npm run ci-prettify` for formatting.
- `npm run build` (alias `compile`) — `tsc --project tsconfig.build.json` + writes `dist/utils/version.js` via `genversion`.
- `docker-compose up -d` — full stack (mps + postgres + vault + consul) for API testing.

Node `>=20`. Project is ESM (`"type": "module"`); intra-repo imports use `.js` extensions on `.ts` source paths. `tsconfig.json` sets `strictNullChecks: false` — do **not** flip this on as a drive-by; existing code relies on it.

## Architecture

### Entry point and wiring (`src/index.ts`)

1. Lowercases every `process.env` key (config keys are lowercase) and runs each value through `parseEnvValue` so booleans/numbers from the environment land typed.
2. `rc('mps')` layers config: defaults in `.mpsrc` → `MPS_*` env vars → CLI args. `loadConfig` then validates `jwt_secret` (mandatory), `web_admin_user/password` (mandatory if `web_auth_enabled`), `cira_window_size` (clamped to `[MIN_CIRA_WINDOW, MAX_CIRA_WINDOW]`), and `mps_tls_config.mps_cert_key_size` (must be in `ALLOWED_MPS_CERT_KEY_SIZES`). The resulting config is stored on `Environment.Config` — that singleton is the source of truth everywhere; do not pass config through constructors.
3. If `consul_enabled`, pulls/seeds config from Consul first via `consul/serviceManager.ts`.
4. `DbCreatorFactory` and `SecretManagerCreatorFactory` instantiate the DB and secret-store providers by **dynamic import** (`../data/${db_provider}/index.js`, `../secrets/${secrets_provider}/index.js`). `waitForDB` and `waitForSecretProvider` use `exponential-backoff` so MPS can come up before Postgres/Vault are ready.
5. Certificates: if `generate_certificates` is true, `Certificates.getCertificates()` self-signs; otherwise either raw cert/key strings (`cert_format: 'raw'`) or PEM files from `cert_path` are loaded for both the MPS TLS server and the web server.
6. `MPSServer` and `WebServer` are constructed and start listening.
7. `MqttProvider` connects if `mqtt_address` is set — lifecycle events (`CIRA_Connected`, `CIRA_Connection`, etc.) publish to MQTT topics.

### Device flow — CIRA + APF (CRITICAL)

The device-side path is **not** request/response. AMT firmware opens a TLS connection to `port` (4433); on top of that runs the **APF protocol** (`src/amt/APFProcessor.ts`) — Intel's variant of SSH-style channel multiplexing. Understand the layering before changing anything in `amt/`:

```
TLS socket (mpsserver.ts)
  └─ APF (APFProcessor.ts)            <- protocol frames: PROTOCOLVERSION, USERAUTH_REQUEST, GLOBAL_REQUEST,
       │                                  CHANNEL_OPEN, CHANNEL_DATA, KEEPALIVE_REQUEST, ...
       ├─ Auth handshake               -> emits 'userAuthRequest' -> MPSServer verifies vs db + Vault,
       │                                  emits 'connected', stores ConnectedDevice in the `devices` map
       └─ CIRAChannel(s) (CIRAChannel.ts) one per AMT target port
            ├─ port 16992 -> CIRAHandler (HttpHandler builds WSMAN-over-HTTP digest envelopes,
            │                             Bottleneck rate-limits at 3 concurrent / 250ms min)
            └─ port 16994/16995/etc -> WsRedirect (raw byte forwarding to/from browser WebSocket for KVM/SOL/IDER)
```

The in-memory `devices` map in `src/server/mpsserver.ts` (exported as `devices`) keys `ConnectedDevice` instances by GUID. **This map is process-local** — multi-instance deployments rely on `device.mpsInstance` in the DB to know which MPS holds a given CIRA connection. The `cira` middleware (`src/middleware/cira.ts`) rejects with 404 if `devices[guid]` is absent or its socket isn't `readyState === 'open'`, so REST callers must hit the MPS instance that owns the connection (Kong/load-balancer affinity).

`APFProcessor.APFEvents` is the integration seam — `MPSServer` subscribes to `userAuthRequest`, `protocolVersion`, `disconnected`, `keepAliveRequest`. Don't add new APF event types without also wiring an `MPSServer` handler.

### REST API (`src/routes/`)

`/api/v1` mounts:

- `/authorize` — JWT issuance for the Sample Web UI (HS256, signed with `jwt_secret`, `exp` in minutes from `jwt_expiration`).
- `/devices` — CRUD on the device inventory (Postgres-backed), plus `/stats`, `/tags`, `/disconnect/:guid`, `/refresh/:guid`, `/redirectstatus/:guid`. Uses `express-validator`; OData query parsing via `routes/devices/deviceValidator.ts`.
- `/amt` — every operation that talks to a live device: audit/event logs, general settings, hardware info, power action / boot options / boot sources / power capabilities / power state, AMT features, version, deactivate, alarms, AMT certificates, KVM display settings, link preference, user consent (request/cancel/send). Every route is gated by `ciraMiddleware`, which resolves `req.deviceAction = new DeviceAction(ciraHandler, ciraSocket)`. Route handlers should call methods on `req.deviceAction` (`DeviceAction.ts`) — they **never** build WSMAN themselves.
- `/ciracert`, `/health`, `/version` — operational endpoints.

KVM/SOL/IDER are **not** REST — the browser opens `wss://<web>/relay/webrelay.ashx?host=<guid>&port=<amtPort>&mode=kvm|sol|ider` with a JWT in the `Sec-WebSocket-Protocol` header. `WebServer.verifyClientToken` validates the JWT (must match `host`, must not be expired) and `WsRedirect` bridges that WebSocket to a `CIRAChannel` on the AMT redirection port.

The public REST surface is described in `swagger.yaml`. The web admin user/password protect the API when `web_auth_enabled` is true, but per-route auth is normally fronted by Kong (see README — Kong's `jwt_secret` must match `.mpsrc.jwt_secret`).

### Custom middleware (`src/middleware/custom/`)

`WebServer.loadCustomMiddleware()` reads `dist/middleware/custom/*.js` at startup and dynamically imports each as Express middleware between `/api/v1` and the route handlers. The directory is intentionally excluded from coverage (`vitest.config.ts`) — it's a downstream extension point, not core code. To add request-pipeline behavior (e.g., tenant resolution that sets `req.tenantId`), add a `.ts` file here.

### Data and secrets (provider-pluggable)

Both layers are dynamically imported by provider name and the factories cache a single instance:

- **DB:** `factories/DbCreatorFactory.ts` → `import('../data/${db_provider}/index.js')`. Ships with `postgres` (`src/data/postgres/`, table classes under `tables/`) and `mongo` (`src/data/mongo/`, collection classes under `collections/`). Default is `postgres`.
- **Secrets:** `factories/SecretManagerCreatorFactory.ts` → `import('../secrets/${secrets_provider}/index.js')`. Only `vault` ships (`src/secrets/vault/`). Device MPS passwords (`MPS_PASSWORD`) and AMT credentials live in Vault, never in the device table.

The dynamic, variable-driven `import()` calls in `index.ts`, `DbCreatorFactory.ts`, and `SecretManagerCreatorFactory.ts` trip Vite's static analyzer during tests — `vitest.config.ts` sets `build.dynamicImportVarsOptions.exclude: [/.*/]` to disable the plugin entirely so Node handles them at runtime. If you add a new variable-driven `import()` and tests fail with a Vite warning, that's the knob.

### Testing notes

- Vitest, globals enabled (`describe`/`it`/`expect`/`beforeEach` without imports — only `vi` is imported explicitly), `pool: 'forks'`. `src/**/*.test.ts`; coverage via `@vitest/coverage-v8` (lcov / html / json in `coverage/`).
- Test timeout is 60s (a few suites do real socket setup).
- `src/middleware/custom/**`, `src/**/test/**`, and `*.d.ts` are excluded from coverage.
- When changing anything in `src/amt/` or `src/server/`, run the corresponding `*.test.ts` — these suites mock the socket layer and assert on APF frame bytes and CIRA channel state machines, so a tiny code change frequently demands a matching test edit.

## Implementation guidelines (non-negotiable)

- **Never hand-author WSMAN XML.** All WSMAN construction goes through `@device-management-toolkit/wsman-messages` (`AMT`, `CIM`, `IPS` namespaces) — see `src/amt/DeviceAction.ts` for the pattern. Add new device operations as methods on `DeviceAction` and call them from route handlers; if a needed message is missing, fix it upstream in `wsman-messages` rather than crafting raw XML here.
- **Route handlers go through `ciraMiddleware` → `req.deviceAction`.** Don't reach into the `devices` map directly from a route handler unless you have a reason that doesn't fit `DeviceAction` (e.g., the `disconnect` route, which must end the socket itself).
- **REST API changes must be backwards compatible.** `/api/v1/*` (and `swagger.yaml` describing it) is consumed by the Sample Web UI, by RPS, and by downstream integrators. Prefer additive changes — new optional fields, new endpoints, new query params — over renaming, removing, or tightening existing ones. The same rule applies to DB column/profile-schema changes: existing rows must keep working. If a breaking change is unavoidable, retain old behavior behind the existing shape and call it out explicitly in the PR description.
- **API changes must update `swagger.yaml` AND the Postman collections in the same PR.** When you add, modify, or remove anything under `/api/v1/*` (route, request/response shape, query param, header, status code), update `swagger.yaml` and the Postman collections under `src/test/collections/` (`MPS.postman_collection.json`, `mps_security_api_test_postman_collection.json`, and `MPS.postman_environment.json` if new variables are needed) in the same PR. These artifacts are the contract integrators and QA test against — a drifted Postman collection or Swagger spec is treated as a bug.
- **Keep PRs small and scoped to one concern.** Touch only the files relevant to the issue. **Do not scope-creep** — unrelated bug, dead code, lint nit, or formatting drift you notice while working belongs in a separate PR/issue. A focused 50-line diff gets reviewed and merged; a 500-line "while I was in there" diff stalls and risks regressions in unrelated CIRA/redirection paths.
- **Work in incremental phases — this is an agile team.** Plan features as a sequence of small, independently-reviewable PRs rather than one big bang. If a PR grows past the point where a reviewer can hold it in their head (rough rule of thumb: a few hundred meaningful lines, or more than one logical concern), stop and break it into smaller PRs that stack. Each PR should leave `main` in a working state.
- **Order PRs around the semver release impact.** Releases are automated from conventional commits: `feat:` cuts a **minor** release, `fix:`/`perf:` cuts a **patch**, `BREAKING CHANGE:` cuts a **major**, and `refactor:`/`docs:`/`test:`/`style:`/`build:`/`ci:`/`chore:` do **not** cut a release. When a feature requires prerequisite plumbing (extracted helpers, internal API reshaping, test scaffolding, schema groundwork that's a no-op without the feature), land those prerequisites first as `refactor:` (or `test:`/`build:` as appropriate) so they ship invisibly. The final user-visible PR is the `feat:` that flips the switch and triggers the minor release. Never bundle prerequisites into a `feat:` commit just to save PRs — that ties the release to scaffolding that wasn't ready for users.
- **Before declaring work done, all three must be green:** `npm test`, `npm run ci-prettify`, `npm run lint`. CI runs the same; fix locally first.
- **Touching CIRA / APF / redirection?** Trace the byte flow from `MPSServer.onDataReceived` → `APFProcessor.processCommand` → `CIRAChannel` → consumer (`CIRAHandler` for WSMAN, `WsRedirect` for KVM/SOL/IDER) and confirm every state transition you touch is covered in the sibling `*.test.ts`. The `devices` map's lifecycle (`handleDeviceConnect` / `handleDeviceDisconnect` / `onClose` socket-id guard) is subtle — old/new connection races have caused real outages.
- **Config keys are lowercase.** `Environment.Config.foo_bar`, never `fooBar`. Env vars are read as `MPS_FOO_BAR` and lowercased on startup. New tunables go in `.mpsrc` with a sensible default, get a constant in `src/utils/constants.ts` if there are bounds to enforce, and get validated in `loadConfig`.

## Commit conventions (see CONTRIBUTING.md)

Format: `<type>(<scope>): <subject>` with body and optional footer. Types: `feat | fix | docs | style | refactor | perf | test | build | ci | revert`. Common scopes in this repo: `apf`, `api`, `cira`, `config`, `db`, `deps`, `deps-dev`, `docker`, `events`, `gh-actions`, `health`, `redir`, `secrets`, `utils`. Subject + body lines ≤72 chars. Footer references a GitHub issue (`Resolves: #1234` or `Fixes: #1234`). Linear history is preferred; PR authors merge via Rebase or Squash.
