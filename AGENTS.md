# Repository guidance

- The application lives in `web/`; source datasets live in `strategic-dependency-graph/data/`.
- Install with `cd web && pnpm install --frozen-lockfile`.
- Synchronize published data with `pnpm sync-data` when source datasets change.
- Run locally with `pnpm dev`.
- Verify changes with `pnpm test` and `pnpm build`.
- Never edit generated files in `web/public/data/` directly; update the source data and run the sync command.
- Never commit dependencies, build output, Netlify state, logs, or credentials.
- Keep changes scoped and review the final diff before committing.
