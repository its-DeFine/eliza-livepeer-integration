# SCB Bridge Implementation Task List

> Keep this file up-to-date as tasks move from _TODO_ → _IN-PROGRESS_ → _DONE_.

| #   | Area          | Task                                                         | Status   | Owner |
| --- | ------------- | ------------------------------------------------------------ | -------- | ----- |
| 1   | S1            | Add CORS + `/scb/ping` endpoint in `neurosync/server/app.py` | DONE     |       |
| 2   | S2            | Create `the-org/src/scb/provider.ts` implementing `Provider` | DONE     |       |
| 3   | S2            | Create `the-org/src/scb/action.ts` implementing `Action`     | DONE     |       |
| 4   | S2            | Export provider/action in `the-org/src/index.ts`             | DONE     |       |
| 5   | Docs          | Finalise ADR (`docs/adr-scb-bridge.md`)                      | DONE     |       |
| 6   | Tests         | Unit tests for provider & action (mock fetch)                | DONE     |       |
| 7   | DevOps        | Docker compose file `docker-compose.bridge.yml`              | DEFERRED |       |
| 8   | CI            | GitHub Action spinning both stacks for E2E ping test         | DEFERRED |       |
| 9   | Security      | Implement optional `X-NeuroSync-Key` validation              | DONE     |       |
| 10  | Observability | Add DEBUG envs + simple request log                          | DONE     |       |

## Notes

- Tasks 2–4 are **inside** the _the-org_ package to avoid plugin-loader issues.
- Use `NEUROSYNC_URL` and `SCB_TOKENS` envs for configuration.
- Unit tests should live at `packages/the-org/__tests__/scb.*.test.ts`.
- Update this table via PR description or direct edits.
