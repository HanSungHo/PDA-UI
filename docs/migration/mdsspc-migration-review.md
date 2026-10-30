# MDSSPC Android-to-Vue Migration Review

## Jira

- [ATSOP26-2663](https://insight.fsoft.com.vn/jiradc/browse/ATSOP26-2663): `activity_mdsspcactivity.xml`
- Merge request: !177

## Requirement

Migrate the Android `MDSspcActivity` interlock popup to the Vue 3 / Quasar app. Keep its UDP entry point, Android values and copy, MDSCONTENT option rules, Save validation, MDSINSERT request and INTLKPOPUPCHECK acknowledgement.

The approved design is Figma file `McFwbjRMkabII8WQm3AIoW`, node `7361:76450`: a 340px dialog in a 360×720 frame. On 2026-10-29 the designer confirmed two points:

- MDSSPC is a dialog, like the other interlock popups (EQP SPC, PR Empty, Recipe Interlock).
- Fields stay in two columns. When text is long, the label gap shrinks (labels hug their text).

## Technical solution

**UDP entry point**

- A high-priority UDP message with `<EVENT_TYPE>MDSSPC</EVENT_TYPE>` reaches the global dialog host through two paths: the native `HifosUdpAlarmService` / `HifosUdpAlarmPlugin`, and `udp-receiver.service.ts`.
- Events are queued. Restored events and live events keep the same native ID.

**Parsing and services**

- `mds-spc.ts` parses Android's positional `<Table diffgr:` segments.
- `mds-spc.service.ts` handles:
  - MDSCONTENT choices
  - MDSINSERT (Save)
  - the INTLKPOPUPCHECK acknowledgement, sent through `SetGasusage`

**UI**

- `MDSSpcScreen.vue` is a `BaseModal` (340px, not closable, not dismissed by an overlay click) containing:
  - `BaseInput` fields, read-only;
  - two `BaseDropdownList` choices;
  - two link `BaseButton`s.
- The field labels set the base `--ds-field-label-width` to `max-content`, so they hug their text.
- `MDSSpcOverlay.vue` holds the logic:
  - choice loading;
  - Save validation, which ignores repeated taps within 1 second, as Android does;
  - the OK acknowledgement;
  - dismissal with the device Back button (Capacitor), without sending the acknowledgement.

**Mock server**

- `mds-spc.handlers.js` handles MDSCONTENT and MDSINSERT.
- `interlock-confirmation.handlers.js` handles every `SETGASUSAGE` confirmation: RECIPE, PR_EMPTY, EQPSPC and MDSSPC.

## Legacy parity

**Kept from Android**

- **Title:** `#MDSSPC INTERLOCK#`. `MDSspcActivity.kt` line 94 replaces the XML default `PR EMPTY INTERLOCK` with this once data arrives.
- **Labels:** `ALARM_LEVEL`, `LOTID`, `PORTID`.
- **Buttons:** `OK`, then `저장`.
- **Highlights:** FACILITY on a yellow background, and SPC 결과 on yellow with red text.
- **Empty values** are blank.

**Behaviour**

- OK sends INTLKPOPUPCHECK and closes.
- 저장 sends MDSINSERT and keeps the popup open. It shows a message when the data was already entered or when a choice is missing.
- The device Back button closes without the acknowledgement.
- Escape does not close the popup; Android has no equivalent.

## Figma differences

| Item                        | Figma `7361:76450`     | Vue                                     | Reason                                                                                                                                |
| --------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Title                       | `PR EMPTY INTERLOCK`   | `#MDSSPC INTERLOCK#`                    | Android. The Figma reference image was captured before data arrived                                                                   |
| Row 1, right field          | `발생시간` (duplicate) | `ALARM_LEVEL`                           | Android. The Figma reference image also shows `ALARM_LEVEL`                                                                           |
| LOT / PORT labels           | `LOT ID`, `PORT ID`    | `LOTID`, `PORTID`                       | Android copy                                                                                                                          |
| Footer order                | `저장`, `OK`           | `OK`, `저장`                            | Android order; asked the designer                                                                                                     |
| FACILITY / SPC 결과 colours | white                  | yellow / yellow + red                   | Android state colours; asked the designer                                                                                             |
| Label column                | 80px                   | hugs the label                          | Designer instruction for long values                                                                                                  |
| Modal width at 360px        | 340px                  | 312px                                   | The `BaseModal` card keeps Quasar's 24px dialog padding. It is 340px on wider screens. This is a base component gap, not changed here |
| Long values at 360px        | `Null` samples         | partly clipped (`2026-10…`, `EQP-DEM…`) | A consequence of two 18px columns, which the designer accepted                                                                        |

## Impact

**Features**

- The MDSSPC feature.
- The global UDP receiver and dialog host.
- The native UDP alarm plugin and service.

**Mock server**

- `registry.js`: MDSSPC handlers.
- `registry.js`: the shared `SETGASUSAGE` confirmation handler, which replaces `eqp-spc.handlers.js` and the `SETGASUSAGE` entry of the Recipe Interlock handlers.
- `registry.js`: the `MASKINFO` routing from `main` is kept.

**Tooling**

- The Playwright configs live under `playwright/config/`.

## Known gaps

- Native UDP delivery and background notifications need verification on a device.
- The modal width at 360px depends on a `BaseModal` change in the base layer.
- The designer has not yet answered on the footer order or the yellow and red highlights.

## Test evidence

- **Vitest:** `tests/features/mds-spc` plus `tests/services/udp-receiver.service.spec.ts`, 5 files, 43/43. A new `MDSSpcScreen.spec.ts` covers the fields, tones, read-only state, emits, footer order and busy state.
- **Playwright** (`playwright/config/playwright.mdsspc.config.mjs`, 360×720): 3/3.
  - The Android values and colours appear.
  - The modal is centred, with two columns and 32px controls.
  - The MDSCONTENT, MDSINSERT and INTLKPOPUPCHECK requests are sent.
  - The pending states block the controls.
  - Escape closes the open dropdown but keeps the popup.
- **Mock server:** 72/72 (`node --test tests/*.test.js`).
- **Lint and type-check:**
  - ESLint: 0 errors. 4 warnings remain in the existing test stubs.
  - Prettier: clean.
  - `vue-tsc`: only errors that also exist on `main` (wafercodecheck, chat-list).

## Coverage

Focused run on `src/features/mds-spc/**` (4 files, 27 tests): **96.9% statements/lines, 76.98% branches, 100% functions**.

## Rollback

Revert the MDSSPC feature, the UDP listener and plugin wiring, the mock-server handlers and the shared confirmation handler, and the related tests, together.
