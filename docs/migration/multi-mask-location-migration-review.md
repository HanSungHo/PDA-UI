# Multi Mask Location Android-to-Vue Migration Review

## Jira

- [ATSOP26-2659](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-2659): `activity_multi_mask_location.xml`
- Merge request: !185

## Requirement

Migrate the Android `MultiMaskLocationActivity` (`activity_multi_mask_location.xml`, 복수 MASK 위치 지정) to Vue 3 / Quasar on the existing `mask-bulk-change` route.

- Keep from Android: copy, messages and flow.
- Follow Figma for presentation: file `McFwbjRMkabII8WQm3AIoW`, node `4185:42827` (360×720), the frame redesigned on 2026-10-29.

## Technical solution

**Screen**

- `MultiMaskLocationPage.vue` uses `BaseScreen` with four `ds-screen__card` sections, `BaseInput`, `BaseDropdownList`, `BaseRevoGrid` (when rows exist) and `BaseEmptyState` (when the list is empty).
- The list card takes the height left by the other cards: 352px in Figma, 348px with the `BaseScreen` default spacing at 360×720.
- MASK TAG keeps the shared 80px label column. The 층 / 사용여부 / 상태 / 위치 labels hug their text, as in Figma.

**Logic** (`use-multi-mask-location.ts`)

1. Scanning a MASK TAG strips the scanner terminator, sends `MASKINFO`, and appends the mask to the grid.
2. List Clear empties the grid.
3. The location selectors cascade:
   - 층
   - 상태: `MASKSTATUSINFO`
   - 위치: `MASKLOCGROUPINFO`
   - 상세위치: `MASKLOCATIONINFO`, sent on the `masklocgroupinfo` route, as Android does
4. 사용여부 is display-only; Android never sends it.
5. 확인 sends `CHANGEMASKLOCATION` (`LOCTYPE=MULTI`) for each row on the `checkpellicle` route, then shows the Android summary dialog.

**Service**

- `multi-mask-location.service.ts` builds the AIFMSG requests and maps the responses.

**Mock server**

- `multi-mask-location.handlers.js` handles `MASKSTATUSINFO`, `MASKLOCGROUPINFO`, `MASKLOCATIONINFO` and `CHANGEMASKLOCATION`.
- `hifos.routes.js` dispatches the two route / MSGNAME aliases by MSGNAME.
- `MASKINFO` is shared with eSheet and Move In Inline:
  - The `registry.js` router sends requests **without `ID_IDENT`** (Multi Mask Location) to the eSheet handler, which returns a single mask.
  - With `ID_IDENT=T`, reticles that have eSheet mask rows go to eSheet and the rest go to Move In Inline.

## Legacy parity

- **Copy** matches Android: `복수 MASK 위치 지정`, `MASK TAG`, `List Clear`, `층`, `사용여부`, `상태`, `위치`, `확인`, `취소`.
- **Routes:** the endpoint aliases follow Android `MessageSender` call sites.
- **Save flow:** change requests run row by row, and the summary dialog reports successes and failures as Android does.
- **Scanning:** like `setMaskInfo`, a new scan is not blocked while an earlier MASKINFO is pending; every scanned mask is added (review !185).
- **Error text:** dialogs show the server `ERRMSG`, or the request error message, as `getErrorMessage` does. A PASS without `MSGBODY` shows `BODY가 존재하지 않습니다` (`MessageSender.checkValidate`). No substitute texts are added (review !185).

## Figma differences

| Item              | Figma `4185:42827`             | Vue                                           | Reason                                                                             |
| ----------------- | ------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| List Clear button | not drawn                      | kept, small secondary button next to MASK TAG | Android control (`btn_clear`)                                                      |
| Content spacing   | 4px padding, 8px between cards | `BaseScreen` default (12px / 16px)            | Base default, not overridden (AGENT.md §5.1). The list card absorbs the difference |
| Footer buttons    | 36px                           | `BaseScreen` default 40px                     | Base default                                                                       |
| Field values      | `Null` samples                 | real values; empty fields stay blank          | Sample data; Android has no hint, so no placeholder (review !185)                  |

## Impact

**Feature**

- The Multi Mask Location feature and its route entry.

**Mock server**

- New handlers and fixtures.
- Route aliases.
- The `MASKINFO` router now also covers requests without `ID_IDENT`. eSheet and Move In Inline requests send `ID_IDENT=T`, so they are routed as before.

**Branch history**

- The branch previously carried old eSheet commits from before !176 was rebased.
- The merge of `main` (`bd3f078`) takes the `main` version of every file outside this feature, so the MR diff contains only Multi Mask Location.

## Known gaps

- Production endpoints and the scanner on a PDA device are not verified; the mock server is used throughout.

## Test evidence

- **Vitest:** `tests/features/multi-mask-location`, 3 files, 20/20.
- **Playwright** (`playwright/config/playwright.multi-mask-location.config.mjs`, 360×720): 3/3.
  - **Layout:** card geometry, no content scroll, the hugging labels, and the reviewed `multi-mask-location-360x720` baseline.
  - **Scan, cascade and change:** scanning, the cascading choices and the change requests on the Android routes.
  - **Failure handling:** a failed mask and missing selections.
- **Manual check (temporary Playwright script):** no content scroll at 360×640, 360×720 and 360×900. The list card is 268px, 348px and 528px tall.
- **Mock server:** 70/70, including the `MASKINFO` routing test.
- **Lint and type-check:**
  - ESLint: 0 errors. Prettier: clean.
  - `vue-tsc`: no errors in this feature. The errors that remain also exist on `main`.

## Coverage

Focused run on `src/features/multi-mask-location/**` (3 files, 20 tests): **97.92% statements/lines, 88.88% branches, 80.55% functions**.

## Rollback

Revert this MR. The feature, the route entry, the mock-server handlers and fixtures, the route aliases and the `MASKINFO` router change must be reverted together.
