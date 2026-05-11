# GitHub Copilot Instructions

See **[../CLAUDE.md](../CLAUDE.md)** — the canonical guide for AI coding assistants in this repository. The content is tool-neutral and applies to GitHub Copilot Chat / Copilot Workspace just as it does to any other agent. Edit `CLAUDE.md`; this file is a pointer.

Key non-negotiables (full detail in `CLAUDE.md`):

- Never hand-author WSMAN XML — use `@device-management-toolkit/wsman-messages` (`AMT` / `CIM` / `IPS` namespaces) via methods on `src/amt/DeviceAction.ts`.
- Route handlers under `/api/v1/amt/*` go through `ciraMiddleware` and call `req.deviceAction.*` — they do not reach into the `devices` map or build WSMAN themselves.
- The `devices` map in `src/server/mpsserver.ts` is process-local. Multi-instance deployments require routing affinity to the MPS that owns a device's CIRA socket — preserve `device.mpsInstance` semantics in DB updates.
- Touching `src/amt/APFProcessor.ts`, `CIRAChannel.ts`, `CIRAHandler.ts`, or `mpsserver.ts` requires updating the sibling `*.test.ts` — they assert on APF frame bytes and channel state transitions.
- REST API (`/api/v1/*`, `swagger.yaml`) and DB schema must stay backwards compatible.
- Config keys are lowercase; new tunables go in `.mpsrc`, validated in `loadConfig`, with bounds constants in `src/utils/constants.ts`.
- Small, focused PRs only. No scope creep.
- Before declaring done: `npm test`, `npm run ci-prettify`, `npm run lint` all green.
