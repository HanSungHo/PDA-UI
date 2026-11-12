# ATOP26 mock server

Express server that answers the hifos2 AIFMSG messages the Vue screens send. All test data lives
here; screens under `src/` call the real message API and never ship client-side mock data.

## Run it

```bash
npm --prefix mock-server ci   # once
npm run mock                  # mock server on http://localhost:8080 (PORT env overrides)
npm run dev                   # Vue app on http://localhost:5173
```

The app's default mobile server is `http://127.0.0.1:8080` (`src/constants/server.ts`), so a
browser session talks to the mock server without extra configuration.

## Entering IDs

Screens keep the legacy HiFOS barcode rules (`src/utils/barcode-style.ts`). A scanner appends one
trailing character, which the screen strips, so when typing by hand:

| Field          | Type                                  | Sent to the server             |
| -------------- | ------------------------------------- | ------------------------------ |
| Equipment scan | `EQP-` + id + one extra char          | `EQP-KJ-01#` -> `KJ-01`        |
| LOT scan       | a leading space + id + one extra char | ` LOT-KJ-001#` -> `LOT-KJ-001` |

Screens opened by route take plain ids in the URL, e.g. `/#/move-in/WP-MEASURE` or
`/#/remote-furnace-kj?lotId=LOT-KJ-001`. Reload the page (not only the hash) when switching LOTs on
the same screen.

## Scenario data

Data: `src/data/fixtures.js`. Handlers: `src/messages/*.handlers.js`, registered in
`src/messages/registry.js`.

Generic rules for the screens without a Vue page yet (`legacy-screens.handlers.js`, e.g. AIT, AEGIS,
XRF, PR, ESD): an id containing `FAIL` makes the message FAIL, `EMPTY` returns an empty list.

| Screen                     | Ids                                                                                                                                                                                                                  | What they cover                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| eSheet                     | `WP00001`, `WP-COMMENT`, `WP-EDC`, `WP-STATUS`, `WP-QTIME`, `WP-AUTO`, `WP-MOVEIN`, `WP-LARGE`, `WP-EMPTY`                                                                                                           | Process list, comments, EDC (D column), states, Q-time, automotive, 10 000 rows, no rows         |
| eSheet business menu       | `WP-RUN`, `WP-HOLD`, `WP-RESERVED`, `WP-ENDED`                                                                                                                                                                       | RUN enables MOVE OUT; HOLD disables MOVE IN / OUT / REWORK / SPLIT; reserved LOT; finished rows  |
| eSheet Furnace             | `WP-KEC`, `WP-OTHER`; `LOT-KJ-001`                                                                                                                                                                                   | KEC / classic furnace; KJ furnace                                                                |
| Move In                    | `LOT-DEMO-01`, `LOT-DEMO-AUTOMOTIVE`, `LOT-MEAS-01`, `LOT-MEAS-BF`, `LOT-MEAS-RUN`, `LOT-MEAS-NONWIP`, `LOT-MEAS-HOLD`, `LOT-MEAS-PHOTO`, `LOT-MEAS-IMP`, `LOT-MEAS-UNREAD`, `LOT-MEAS-RESUSER`                      | Normal, probe card, LOT state guards, unread comments, reserved LOT                              |
| Move In -> Process Inquire | `WP-MEASURE`, `WP-MEASURE-DICYCLE`, `WP-MEASDONE`                                                                                                                                                                    | MEASUREINFO grid; DI cycle check; "검색한 MEASURE" finishes back to Move In                      |
| Move In -> Batch           | `LOT-DEMO-BATCH` (batch `BAT-A260915-001`)                                                                                                                                                                           | Batch LOT list, Batch Move In (MW_TEST row dropped); a LOT id containing `MVINFAIL` fails MOVEIN |
| Remote Furnace KJ          | `?lotId=LOT-KJ-001`, equipment `KJ-01` (batch `BAT-KJ-01`, LOT `LOT-KJ-EXT`)                                                                                                                                         | LOT / batch / port / recipe, START -> FURNACEREMOTESTART_KJ                                      |
| Remote CVD                 | equipment `CVD01`, `CVD-EMPTY`, `TE8500_01`; LOT `CVD-MOCK-001`                                                                                                                                                      | Recipe, TE recipe, memorization, ports                                                           |
| Remote IMP                 | `LOT-IMP-01`, `LOT-IMP-02`, `LOT-IMP-CMT-01`, `LOT-IMP-DIFF-RCP`, `LOT-IMP-POPUP`, `LOT-IMP-MEMO-ERR`, `LOT-IMP-NOT-WIP`, `LOT-IMP-HOLD`, `LOT-IMP-BATCHED`, `LOT-IMP-WRONG-AREA`, `LOT-IMP-RESERVED`, `LOT-IMP-RUN` | Happy path, unread comments, recipe branches, LOTINFO error categories                           |
| Remote Meas                | equipment from `remoteMeasMainFixtures` (AIT / AEGIS / XRF models)                                                                                                                                                   | Routing by MODEL; `FAIL` / `EMPTY` ids                                                           |
| Activity batch             | `LOT-ACT-*`, equipment `EQP-BATCH`, `BATCH-SAMPLE`, `BATCH-REMOTE`, `BATCH-WARNING`, `BATCH-FAIL-CHECK`, `BATCH-FAIL-CREATE`                                                                                         | Batch create / precheck branches                                                                 |
| Merge                      | `LOT-A260915-018`, `LOT-MERGE-MFG2`, `LOT-MERGE-CHILD`, `LOT-MERGE-EMPTY`                                                                                                                                            | Candidates, MFG group confirm, child LOT warning, nothing to merge                               |
| Split                      | `ABC1234X`, `HOLD0001`, `BATCH001`, `SAMPLE01`, `SCRAP001`, `CUSTLOT1`, `OLDLOT6`                                                                                                                                    | Each SplitActivity guard                                                                         |
| EEN                        | LOTs `LOT-DEMO-01`, `LOT-260927-001`; facility `GUMI`, `EMPTY-TAGS`                                                                                                                                                  | EEN list / modify; a LOT containing `ERROR` fails                                                |
| Test Tuning                | `TT-EQP01`, `TT-EQP02`, `TT-EQP-EMPTY`                                                                                                                                                                               | Main / sub / body lookups; `FAIL` in an id fails that step                                       |
| Mask Location              | reticles `RT-0001`, `RT-0002`, `RT-FAIL`; location `BAD`                                                                                                                                                             | Status / group / location lookups; `BAD` is the location the change rejects                      |
| Comment View               | `POST /comment(Set)?scenario=` `current-writable`, `current-checked`, `current-read-only`, `historical`, `empty`, `comment-set-error`, `comment-error`                                                               | Dev-only preview states                                                                          |

Look at the comment above each fixture for the exact branch it drives.

## Adding data

1. Add the fixture in `src/data/fixtures.js` and, when a message is new, its handler in
   `src/messages/` registered in `registry.js`. Answer with the MSGBODY keys the legacy Activity
   reads (see `docs/mock-parity/legacy-messages.json`).
2. Add a test under `tests/` and run `node --test tests/*.test.js` in `mock-server/`.
3. Refresh the parity inventory against a hifos2 checkout:

   ```bash
   node mock-server/tools/parity-inventory.mjs --legacy <path-to-hifos2>
   ```

   It rewrites `docs/mock-parity/` and `src/routes/legacy-route-aliases.generated.js`;
   `tests/legacy-parity.test.js` fails when a legacy message has no handler.
