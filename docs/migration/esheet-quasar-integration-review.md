# eSheet Android-to-Vue Migration Review

## Jira

- [ATSOP26-1295](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-1295): `activity_esheet.xml`
- Merge request: !176

## Requirement

Migrate the eSheet parent screen (`ESheetActivity`, `activity_esheet.xml`) to the Quasar
application. Keep Android behavior, user-facing copy, navigation contracts, validation, state
handling and message semantics. Follow the approved Figma frame for presentation where it does
not conflict with Android.

The Figma frame is file `McFwbjRMkabII8WQm3AIoW`, node `1551:44251`, size 360×720.

## Technical solution

**Screen structure**

- `BaseScreen` provides the header (`eSheet (<OPERATOR_NAME>)`), the scrollable content and the footer.
- The four cards use `ds-screen__card`.
- The footer buttons use `ds-screen__actions`.

**Controls**

- `BaseInput`, `BaseButton` and `BaseCheckbox`.
- `ESheetProcessGrid`, built on the shared `BaseRevoGrid`.

**Layout**

- The page fits `100dvh`, and only the process grid scrolls.
- On screens shorter than the layout, the cards scroll above the fixed footer, and the grid keeps at least its header and one row.

**Data**

- `esheet.mapper.ts` maps `ESHEETINFO` into:
  - the summary fields
  - the current-process fields (`mapCurrentProcessSummary`)
  - the process rows
  - the comment state
  - the action availability

**Messages**

- Mock-backed adapters handle `ESHEETINFO`, `GETWAFER`, `MASKINFO`, `PCMREWORKRECIPE`, `CHECKFUTURE`, `CHECKPHOTOSAMPLE` and `FURNACE_KJCHECK`.
- `FURNACE_KJCHECK` routes Furnace to KJ (`CNT=0`), KEC (`CNT=KEC`) or standard Furnace (any other value).

**Mock server**

- Duplicate `MACHINEPORTSTATUS` / `MACHINEPORTCLEAR` handlers are routed by equipment.
- Duplicate `SETGASUSAGE` handlers are routed by the payload `EVENT_TYPE`, through the exported `createMachinePortHandler` and `createSetGasUsageHandler`.
- `MASKINFO` is shared with Move In Inline. A `RETICLEID` with eSheet mask rows goes to eSheet, and any other goes to Move In Inline (`createMaskInfoHandler`). As a result, an unknown reticle now gets the Move In Inline response.
- The branch rebase had left two copies of this routing nested in `registry.js`, a syntax error that stopped the mock server from starting. One copy remains.

**Android state colours**

- Q-time, real recipe, ENGR2, JOB CODE, LOT type/status and the grid rows use the exact Android colours.
- These colours are component-local custom properties, because neither Figma nor `design-tokens.css` defines them.

## Legacy parity

Android remains the source of truth for behavior, state and copy:

**Header data and errors**

- When `ESHEETINFO` returns no `ESHEETITEMS`, the LOT header and the M action are filled before the `ESHEETITEMS가 존재하지 않습니다.` error.

**F (Future)**

- F uses the operation from the last process-row tap (Android `opM`/`opS`).
- Until a row is tapped, F shows `공정을 선택해야 합니다.`.
- Taps on cells with their own action do not record the operation: the comment count on M/P rows, D=`Y`, and non-empty DESCRIPTION, 기준장비 or RECIPE.
- The recorded operation is kept across LOT lookups.

**Dialogs**

- MASKINFO dialogs open in response row order. Android launches them from the last row, so row 0 is seen first.

**Current-process fields** (`ESheetActivity`)

- A moved-in LOT shows the running equipment and no RECIPE.
- A Metrology WAIT LOT shows `LASTLOGGEDOUTTIME` in the machine field.
- RECIPE and machine open their dialogs on double-tap or Enter only while the LOT is not moved in. GoldenPath is added to the machine dialog.

**Q-time**

- When `QTIMECHECK` is set, 정비 항목 is red with yellow text, and `Q-T 대상` is appended.
- The text is smaller in that state, because Android drops it from 16sp to 12sp.

**Grid rows** (`setEsheetRowColor`)

- current: blue, with white text
- P/M: `#ffffd0`
- S/C/SKIP: `#dcdcdc`
- other: `#fffff0`
- HOLD: `#f5c6ec`
- Comment rows: red body cells, while the pinned process cell keeps its state colour.
- The selected row gets a 3dp `mainColor` outline.

## Figma differences (agreed, Android kept)

**Copy and values**

- Title: `eSheet (<OPERATOR_NAME>)` (Figma: `ESHEET`).
- Empty CUT OFF, TAT and 정비 항목 values are blank (Figma: `Null`).
- Empty C/I/O cells and LOT chips are blank (Figma: `-`).
- LOT status is shown as returned, `WAIT` (Figma: `Wait`).

**Colours**

- The status chips, JOB CODE, real recipe and ENGR2 use the Android state colours (Figma: grey, or a red border).
- The grid rows use the Android colours (Figma: neutral).

**Field states**

- Display-only fields are `readonly` with a white background. Figma draws them Disabled (grey).
- Disabled would remove the RECIPE double-tap/Enter dialog (user decision, 2026-10-28).

**Controls**

- The LOT search is a `조회` text button, as in Figma (Android: icon-only).
- The Android ◀ ▶ grid buttons are not migrated. The customer dropped them because RevoGrid scrolling replaces them.

**Base component defaults**

- Footer: the four BaseScreen action buttons are equal, 78px wide (Figma: 母 LOT 68px, the others 81px). With the `medium` button padding, 68px truncates `母 LOT`.
- 잔여: the label column is the shared horizontal-field label width, 80px (Figma: the label hugs its text). The page does not override it.

**App-wide details** (not changed here)

- The DESCRIPTION cell clips without an ellipsis.
- The BaseCheckbox border is neutral (Figma: teal).
- Bold text is synthesized, because only Noto Sans KR 400 is bundled.

## Impact

**Page and feature**

- The eSheet page, mapper, services, dialogs and process grid.
- The shared `BaseRevoGrid` pointer interaction and column mapping.

**Routes**

- A distinct `/remote-furnace-kec` route.
- Dispatching opens eSheet with the selected LOT.

**Mock server**

- Message routing in `registry.js`.

**Base layer** (from the team lead's BaseScreen commit)

- `base-screen.css`: the screen is fixed at `100dvh`, and the content scrolls.
- `base-button.css`: `.ds-btn.q-btn { min-height: 0 }`.
- These affect every `BaseScreen` / `BaseButton` consumer.

No production endpoint or dependency changes.

## Known gaps and follow-ups

- **Parent entry points:** Lot Status by Bay and Remote Aegis are not migrated, so their eSheet entry points are pending.
- **Child results:** the result contracts and refresh behavior still need per-flow verification.
- **Backend:** the production customer endpoints, authentication, timeouts and error contracts are pending. All message calls use the mock server.
- **Furnace menu:** `src/router/routes.ts` sends the "DIFF Test 자동화" menu item to `RemoteFurnacePage`, while Android opens `RemoteFurnaceInitActivity`. The Furnace owners need to confirm.
- **Grid filtering:** `BaseRevoGrid` resolves clicked rows by the visible `data-rgrow` index. Filtering, sorting or trimming would need RevoGrid's row model.

## Test evidence

- **Unit tests (Vitest):** full suite matching CI before this update: 2732/2733. The one failure was the footer-size assertion, now fixed.
- **Focused eSheet suite:** 16 files, 134/134.
- **Mock server:** 66/66 (`node --test tests/*.test.js`), including the MASKINFO routing.
- **Playwright E2E** (`playwright/config/playwright.esheet.config.mjs`): 14/14.
  - At 360×720: header 36, cards 88/240/192/88, footer 44, every input 32px, footer buttons 78×36 without truncation, no page scroll.
  - The `esheet-360x720` baseline was regenerated. The expected, actual and diff images were reviewed: they differ by the 88px first card, the footer buttons and the 잔여 label column.
  - At 360×640 and 360×800, every field stays reachable.
- **Lint and type-check:**
  - ESLint: 0 errors. 2 existing `vue/one-component-per-file` warnings remain in `ESheetPage.spec.ts`.
  - Prettier: clean.
  - `vue-tsc`: no errors in the eSheet files. The errors that remain also exist on `main` (wafercodecheck, chat-list).
- **Build:** `npm run build` passed.

## Coverage

Focused run (16 files, 134/134 tests) on `src/pages/ESheetPage.vue` and `src/features/esheet/**`:
**92.96% statements/lines, 83.3% branches, 82.56% functions**.

## Rollback

Revert the eSheet page, process grid, mapper, services, route, mock-server message routing and the focused tests together. After rollback, recheck mock-server startup and the Remote CVD / Remote Meas / SetGasusage routing.
