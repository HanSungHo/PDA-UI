# EEN Setting / Delete / Modify 360×720 Layout Review

## Jira

- Jira: [ATSOP26-2755](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-2755) (EEN 설정), [ATSOP26-2756](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-2756) (EEN 삭제), [ATSOP26-2757](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-2757) (EEN 수정)
- Merge request: !201

## Requirement

The designer redesigned the three EEN screens to a 360×720 frame. The Figma node ids are unchanged; the frames were checked on 2026-10-30.

| Screen   | Android                    | Figma        | Before (main `7871f0f`)                   |
| -------- | -------------------------- | ------------ | ----------------------------------------- |
| EEN 설정 | `activity_een_setting.xml` | `3552:39095` | 360×872, labels above values, 60px header |
| EEN 삭제 | `activity_een_delete.xml`  | `3552:39440` | 360×992, labels above values              |
| EEN 수정 | `activity_een_modify.xml`  | `3558:41872` | 360×994, horizontal fields with 76px rows |

Messages and copy do not change. The presentation moves to the new frames, and the screens now call the server the way Android does: before this MR they ran on a client-side mock (see **Server calls**).

## Technical solution

**Structure**

- All three pages render inside `BaseScreen`, using its 36px header and its 44px footer through the `#footer` slot.
- Content sits in `ds-screen__card` sections.
- Fields are `BaseInput` / `BaseDropdownList` in the default horizontal Input Form layout: 32px controls, label beside the control.
- The hand-built shells (custom header and footer, fixed 872/992px heights, hex colours, the gradient) were removed. Page CSS now only sizes the cards and styles the grid with design tokens.

**EEN 설정**

- LOT No., Route, 현재공정, the process description and 제품명 are read-only `BaseInput` fields.
  - The process description has no Android caption, so it gets the accessible name `현재공정 설명`.
- The EEN list card takes the remaining height, so the screen does not scroll at 360×720.
- The footer has 추가 / 수정 / 삭제 / 닫기 (medium buttons), in Android order.

**EEN 삭제 / EEN 수정**

- Eight field rows, then two text areas: Tag Comment, and 삭제 사유 or 변경 사유.
- ROUTE, 공정, ACTION POINT and TAG ID on Delete, and ROUTE and 공정 on Modify, are read-only text in Android.
  - They render as muted read-only inputs with a chevron, matching Figma's locked dropdowns.
- On Modify, ACTION POINT and TAG ID stay editable `BaseDropdownList` controls, as in Android (`Spinner`).
- The footer has 확인 / 취소 (medium buttons).
- On viewports shorter than 720px, the `BaseScreen` content area scrolls; the pages add no scroll container of their own.

**Server calls (Android parity)**

Before this MR the three screens ran on a client-side mock (`een-setting.mock.ts`, now deleted):

- The list never called the server.
- Delete only removed a row from the mock array.
- Modify and Delete looked the row up in that array.
- Missing query values fell back to demo data (`LOT-DEMO-01`).

They now follow Android:

| Action                         | Android                                                                                                                        | Vue                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| EEN list                       | `getEenList(LOTNAME, FACILITY)` → `MessageName.MESSAGE`                                                                        | `GETEENLIST` on `/hifos/message`; `ITEMS.ITEM` mapped to the grid columns                     |
| Selected row → Modify / Delete | Intent extras `LOTID`, `EENID`, `TAGCOMMENT`, `ACTIONPOINT`, `FACTORYNAME`, `PRODUCT`, `ROUTE`, `OPERATION`, `TAGID`, `PODESC` | Same values as route query; Modify and Delete read the row from it                            |
| TAG choices                    | `getTagId(FACTORYNAME)` → `MessageName.GETTAGID`                                                                               | `GETTAGID` on `/hifos/gettagid`                                                               |
| Update                         | `updateEen(...)` → `MessageName.MESSAGE`                                                                                       | `UPDATEEEN` on `/hifos/message` (was `/hifos/updateeen`)                                      |
| Delete                         | `deleteEen(...)` → `MessageName.MESSAGE`                                                                                       | `DELETEEEN` on `/hifos/message` (was mock only)                                               |
| Return to the list             | `RESULT_OK` → `getEENInfo()`, focus the first row of the current operation                                                     | EEN Setting reloads `GETEENLIST` on return and selects the first row of the current operation |

Other fixes:

- EEN Setting no longer opens EEN Add with `mock=een-add`, which forced EEN Add into its mock mode.
- The mock server gains EEN handlers:
  - `GETEENLIST` and `DELETEEEN`, with rows for `LOT-DEMO-01` and `LOT-260927-001`; LOTs containing `ERROR` fail.
  - EEN Add's `GETPROCESSFLOW`, `GETPROCESSOPERATION`, `GETTAGPOSITION` and `INSERTEEN`, so Setting → Add → save works locally. An inserted row appears in the next `GETEENLIST`.
- The Delete validation dialog uses the Android title `삭제 사유 입력`.
- `een-setting.mock.ts`, the unused `een-setting.message-factory.ts` and the Setting result store were removed.

**Unchanged**

- Routes, dialogs and messages.
- The Tag Comment text area still resizes vertically.

## Control inventory (Android ↔ Figma)

Figma has every Android control on all three screens and adds none.

## Android vs Figma differences (Android kept unless noted)

| Screen          | Item             | Android                   | Figma                         | Implemented                                |
| --------------- | ---------------- | ------------------------- | ----------------------------- | ------------------------------------------ |
| EEN 설정        | Route label      | `Route`                   | `ROUTE`                       | `Route` (Android)                          |
| EEN 설정        | Grid headers     | `공정명`, `TAGCOMMENT`, … | `Process Name`, `Tag Comment` | Android headers                            |
| EEN 설정        | Grid columns     | 7 columns                 | 2 visible columns             | All 7 columns, horizontal scroll           |
| Delete / Modify | Read-only fields | plain text                | locked dropdown with chevron  | muted read-only input with chevron (Figma) |

## Shared field fixes (base)

Two shared Input Form rules differed from the Figma Input Field. Both were fixed in the base component, not per page.

- **Long labels wrap.**
  - The horizontal label used to be single-line with an ellipsis, so `ACTION POINT` showed as `ACTION POI…`.
  - It now wraps onto up to two 14px lines, as the Figma Input Field does (28px label in a 32px row), then ellipsizes.
  - Files: `base-field-shell.css` and its contract test `base-text-field.spec.ts`.
- **Indicator-slot icons are 16px.**
  - Icons passed through `BaseDropdownList`'s `#indicator` slot kept Quasar's 24px marginal font inside a 16px box, so the glyph sat low.
  - The marginal now uses `--ds-text-field-icon-size`, like BaseInput. This also fixes EEN Add, Remote CVD, Remote Furnace KEC and Remote Machine Select.
  - File: `base-dropdown-list.css`.

## Known presentation gaps

- **Content inset:** the `BaseScreen` default is 12px padding with 16px between cards; Figma uses 4px and 8px. This is the same gap as on every screen, and it is not overridden here.

## Verification

- **Vitest:** `tests/features/een-setting` (4 files): 44/44 passed.
  - With `tests/components/base` and `tests/features/een-add`: 28 files, 399/399 passed.
  - Coverage for `src/features/een-setting/**`: 96.6% statements, 85.6% branches.
- **Playwright:** `playwright.een-modify.config.mjs`, now 360×720: 3/3 passed.
  - It checks the 720 layout (44px footer at y=676, no page scroll) and the UPDATEEEN flow.
- **Geometry at 360×720 (all three screens):**
  - Header 36px; footer 44px at y=676; fields 32px; buttons 36px.
  - Page scroll height 720.
- **Playwright:** `playwright.screen-width-alignment.config.mjs`: 9 passed, 3 failed.
  - Its EEN cases were moved to the 720 layout and pass.
  - The three failures are not EEN: the Remote CVD / KJ fluid-gutter check, the Move In comment unit, and Remote CVD typography. They fail the same way on `main` `7871f0f`, which has 4 failures; the fourth was the old EEN footer case.
- **Figma vs Vue captures:** `local/screens/release-2026-10-30/een-*-figma-vs-vue-360x720.png`.
