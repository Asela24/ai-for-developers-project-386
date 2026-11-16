# AGENTS.md

pnpm workspace: `apps/server` (Fastify) and `apps/web` (Vite + React + TanStack Router + shadcn/ui). Tools are pinned in `mise.toml`. If `pnpm`/`node` aren't on PATH, use `mise exec --`.

## Commands

```bash
mise run check          # every gate, same as CI: lint, format, types, knip, syncpack, API tests, contract drift, booking-rule probe, Playwright e2e on a real server, build
mise run fix            # autofix formatting
pnpm contract           # regenerate OpenAPI, web SDK and server types from specs/*.tsp
mise daemons start web  # dev servers: server :3000, web :5173 (use daemons, not `pnpm dev &`)
mise daemons ls | logs server | stop web server
pnpm --filter server exec vitest run src/app.test.ts   # single test file
```

## Notes

- TypeScript is pinned to 5.x on purpose: tools that use the TS compiler API break on TS 7.
- Server tests call `buildApp().inject(...)` from `src/app.ts`. No port is opened.
- The web app calls the API under `/api`. In dev the Vite server proxies it to the server with the prefix stripped. The Docker image is one process: with `WEB_ROOT` set, the server serves the built web app and mounts the API under `/api` itself.
- The web app calls the API only through the generated SDK in `apps/web/src/client`.

## Generated files

Change the source, then regenerate. Edit these files only through their generator; `mise run check` fails when they drift from the committed copy.

| Generated                        | Source                 | Command                      |
| -------------------------------- | ---------------------- | ---------------------------- |
| `openapi/openapi.yaml`           | `specs/*.tsp`          | `pnpm contract`              |
| `apps/web/src/client/`           | `openapi/openapi.yaml` | `pnpm contract`              |
| `apps/server/src/openapi.gen.ts` | `openapi/openapi.yaml` | `pnpm contract`              |
| `apps/web/src/routeTree.gen.ts`  | `apps/web/src/routes/` | `pnpm build` (router plugin) |

## Rules

- Never edit, rename or delete `.github/workflows/hexlet-check.yml`.
- Don't disable lint rules or weaken checks to make a change pass. Exceptions stay narrow and commented (see `.oxlintrc.json`, `knip.jsonc`, `.oxfmtrc.json`, `hk.pkl`).
- Commits follow Conventional Commits (`feat(web): …`, `fix(server): …`, `chore: …`), enforced by commitlint in the `commit-msg` hook.
- Implementation commits name their ticket in a `Refs #N` footer (the GitHub issue the change implements).

## Agent skills

### Issue tracker

GitHub Issues of this repo, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root (created lazily). See `docs/agents/domain.md`.
