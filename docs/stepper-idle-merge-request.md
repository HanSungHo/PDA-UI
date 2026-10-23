# [No JIRA] Add Stepper Idle Alarm Dialog and Routing

## Jira Link

Not provided

## Requirement Summary

- Surface a Stepper IDLE alarm received from the UDP alarm stream.
- Display the occurrence time, equipment, LOT, wafer, and the legacy seven-minute notice.
- Allow the user to acknowledge the alarm with an OK action.
- Migrate the Android `StepperIDLEActivity` dialog-like screen into the Vue3 app-wide dialog host.

## Technical Solution

### Architecture

- Page/dialog: `src/features/stepper-idle/components/StepperIdleDialog.vue`
- Composable: `src/features/stepper-idle/composables/use-stepper-idle.ts`
- UDP service: `src/services/udp-receiver.service.ts`
- Global host and app startup: `src/components/GlobalDialogHost.vue`, `src/App.vue`
- Parser/types/mock: `src/features/stepper-idle/utils/stepper-idle-parser.ts`, `src/features/stepper-idle/types/stepper-idle.types.ts`, `src/features/stepper-idle/mocks/stepper-idle.mock.ts`
- Tests: `tests/features/stepper-idle/`, `tests/services/udp-receiver.service.spec.ts`, `playwright-tests/stepper-idle.spec.ts`

### Business Logic Migration

- Legacy source: `StepperIDLEActivity.kt` and `activity_stepper_idleactivity.xml` in the `hifos2` workspace; HIGH `STEPPERIDLE` messages are routed by legacy `UDPReceiver` with the raw receiver message.
- Parser maps positional split fields to `sTime`, `sEqpid`, `sLotid`, and `sWafer` and retains the legacy string guard `value > "0"`.
- OK closes the modal; overlay and close-icon dismissal are disabled.
- No screen-level REST/API request, validation flow, selection, or result contract exists.
- Android `HifosUdpAlarmPlugin` now forwards HIGH Stepper IDLE packets through a dedicated `udpMessage` event before generic special-event filtering; Vue routes that payload to the global dialog.
- The unsupported Recipe Interlock branch was removed because this repository has no registered Recipe Interlock route/page.
- Multi-row XML values now concatenate without separators, matching Android `TextView.append()`.
- Empty fields display `Null` to match Figma; the label remains `WAFER_NO` to honor the user's legacy-label preference over Figma's `WAFER No.`.

### Key Decisions

- Preserve legacy business field names and Korean labels.
- Prefer the legacy `WAFER_NO` label over Figma's `WAFER No.` as explicitly requested.
- Use shared `BaseModal`, `BaseInput`, and `BaseButton` components.
- Parse the raw message in a feature composable/parser rather than coupling XML extraction to the dialog.
- Maintain the global dialog host pattern for app-level UDP alarms.

## Impact Analysis

### Files Added

- `playwright-tests/stepper-idle.spec.ts`
- `src/components/GlobalDialogHost.vue`
- `src/features/stepper-idle/components/StepperIdleDialog.vue`
- `src/features/stepper-idle/composables/use-stepper-idle.ts`
- `src/features/stepper-idle/index.ts`
- `src/features/stepper-idle/mocks/stepper-idle.mock.ts`
- `src/features/stepper-idle/types/stepper-idle.types.ts`
- `src/features/stepper-idle/utils/stepper-idle-parser.ts`
- `src/services/udp-receiver.service.ts`
- `tests/features/stepper-idle/StepperIdleDialog.spec.ts`
- `tests/features/stepper-idle/stepper-idle-parser.spec.ts`
- `tests/features/stepper-idle/use-stepper-idle.spec.ts`
- `tests/services/udp-receiver.service.spec.ts`

### Files Modified

- `src/App.vue`
- MR follow-up changes also update `HifosUdpAlarmPlugin.java`, the UDP service, the Stepper IDLE parser/dialog, and their UT/E2E specifications.

### Breaking Changes

- None intended.
- Native delivery now has a dedicated event path, but Android compilation/device verification remains pending because this environment has no Java/JDK configured.

### Dependencies

- `GlobalDialogHost`, `BaseModal`, `BaseInput`, and `BaseButton`
- Capacitor `HifosUdpAlarm` plugin and UDP event contract
- App root lifecycle in `App.vue`

## Test Evidence

### Functional Verification

- Unit tests cover parsing the sample XML, popup state and message dispatch, modal field rendering, OK dismissal, and outside-click prevention.
- Focused unit and scoped coverage run: 46 passed, 0 failed; both `StepperIdleDialog.vue` and `udp-receiver.service.ts` report 100% function coverage.
- Focused ESLint and Prettier checks passed.
- Type check reports only the unrelated `tests/features/remote-cvd/RemoteCvdPage.spec.ts` error; the unsupported Recipe route reference was removed.
- Playwright could not connect to `127.0.0.1:6006`; the configured Storybook server was not listening, so browser assertions did not run.
- Native event-to-Vue callback is unit tested; Android compilation and on-device UDP/vibration verification remain unverified because Java/JDK is unavailable.

### Mock Test Data and Steps

Fixture: `stepperIdleMockMessage` in `src/features/stepper-idle/mocks/stepper-idle.mock.ts`

- `level`: `HIGH`
- `EVENT_TYPE`: `STEPPERIDLE`
- `TIME`: `2026-10-21T09:15:30.000+09:00`
- `MACHINE`: `STEPPER-EQP-01`
- `LOTID`: `LOT-DEMO-IDLE-01`
- `WAFER`: `12`

Success/display flow:

1. Load the app and invoke `window.mockStepperIdle(stepperIdleMockMessage)` (or run the existing Playwright helper).
2. Expected: Stepper IDLE dialog with the four fixture values, `WAFER_NO` label, and Korean seven-minute notice; clicking OK closes the dialog without navigating away. At a 360px viewport, the dialog width is 340px.
3. This exercises browser-side dispatch only, not the native Capacitor UDP path.

Empty-result flow:

1. Invoke `window.mockStepperIdle('<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE><INTERLOCKMANAGER></INTERLOCKMANAGER>')`.
2. The Vue dialog displays `Null` in all four empty fields, matching the reviewed Figma state. This intentionally differs from Android's blank defaults.

Business-failure/API flow:

- Not applicable: this screen has no backend request or business-response contract. Native transport failure and actual-device dispatch remain unverified.

### QC Result

- Self-test: 46 focused unit tests passed; focused lint and formatting checks passed.
- Regression: full E2E and full repository test suites were not run. The focused Playwright attempt could not start because Storybook was unavailable on port 6006.

### Command Result

| Command                                                                                                                                                                                                                                                                 | Result                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm test`                                                                                                                                                                                                                                                              | Not run (focused Vitest command used instead).                                                         |
| `npm run test:coverage`                                                                                                                                                                                                                                                 | Not run as a full-repository command; scoped coverage command below passed.                            |
| `npm exec vitest -- run tests/features/stepper-idle tests/services/udp-receiver.service.spec.ts --pool=threads`                                                                                                                                                         | Passed: 46 tests.                                                                                      |
| `npm exec vitest -- run tests/features/stepper-idle tests/services/udp-receiver.service.spec.ts --pool=threads --coverage --coverage.all=false --coverage.include="src/features/stepper-idle/**/*.{ts,vue}" --coverage.include="src/services/udp-receiver.service.ts"`  | Passed: 46 tests; 100% function coverage for both requested files.                                     |
| Focused Playwright Stepper IDLE test                                                                                                                                                                                                                                    | Blocked before assertions: could not connect to `127.0.0.1:6006`; Storybook was unavailable.           |
| `npm run lint`                                                                                                                                                                                                                                                          | Not run (formatting/fixing command); scoped ESLint command was used.                                   |
| `npm exec eslint -- -c ./eslint.config.js src/App.vue src/components/GlobalDialogHost.vue src/features/stepper-idle src/services/udp-receiver.service.ts tests/features/stepper-idle tests/services/udp-receiver.service.spec.ts playwright-tests/stepper-idle.spec.ts` | Passed.                                                                                                |
| `npm run type-check`                                                                                                                                                                                                                                                    | Failed only on unrelated `tests/features/remote-cvd/RemoteCvdPage.spec.ts` (`VueNode<Element>.style`). |
| Android Gradle compile                                                                                                                                                                                                                                                  | Blocked: Java/JDK is unavailable (`JAVA_HOME` is not set).                                             |
| `npm run build`                                                                                                                                                                                                                                                         | Not run.                                                                                               |
| Husky                                                                                                                                                                                                                                                                   | Not run.                                                                                               |
| Mock-server test (`node --test mock-server/tests/mock-server.test.js`)                                                                                                                                                                                                  | Not run; no mock-server handler/API is part of this feature.                                           |

Existing unrelated type error: `tests/features/remote-cvd/RemoteCvdPage.spec.ts` reports `VueNode<Element>.style` missing.

## Screenshots / Videos

![screen-01](attachment)

![screen-02](attachment)

![screen-03](attachment)

## Rollback Plan

1. Revert the Stepper Idle feature commit.
2. Remove the added dialog, parser, composable, UDP service, host, mocks, and tests listed above.
3. Restore `src/App.vue` to its prior dialog mounting behavior.
4. No database migration rollback is required.

## Test Coverage Result

Coverage Summary

- Statements: 100%
- Branches: 95.23%
- Functions: 100%
- Lines: 100%

The scoped run covered `src/features/stepper-idle/**/*.{ts,vue}` and `src/services/udp-receiver.service.ts`; each target file reports 100% function coverage. This is scoped coverage, not a full-repository report.

Mock-server tests are separate from Vue unit, coverage, and E2E results; no mock-server test was run for this feature.

## Link Reference Documents

- Migration review: [stepper-idle-migration-review.md](migration/stepper-idle-migration-review.md)
- Checklist document: Not provided separately; see the migration review checklist.
- Design document: Not provided.
- Figma link: Not provided.

## Migration Validation Summary

Migration Source:

- Android Activity: `hifos2/app/src/main/java/com/keyfoundry/hifos/view/dialog/StepperIDLEActivity.kt`
- Android XML: `hifos2/app/src/main/res/layout/activity_stepper_idleactivity.xml`

Validation Result:

| Category         | Status                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Screen Layout    | ⚠️ Modal width and empty state match reviewed Figma; legacy `WAFER_NO` label retained; icon parity remains open. |
| Event Mapping    | ⚠️ Dedicated native event path implemented; Android build/device verification pending.                           |
| Validation Logic | N/A; no screen input validation exists.                                                                          |
| API Mapping      | ⚠️ No backend API; native UDP path is not device-verified.                                                       |
| Navigation       | ⚠️ OK dismissal maps; native entry and Back/Escape parity unverified.                                            |
| Dialog Flow      | ✅ Focused unit tests pass; browser run blocked by unavailable Storybook.                                        |
| Data Contract    | ⚠️ Multi-row append behavior matches legacy; native device path pending.                                         |

Known Differences:

- The legacy label `WAFER_NO` is retained instead of Figma's `WAFER No.` to prioritize Android parity.
- Empty fields display `Null` per Figma, intentionally differing from Android's blank defaults.
- Android's header message icon remains omitted; modal width follows Figma at the reviewed 360px viewport rather than XML's fixed 300dp width.
- Native event forwarding was added but could not be compiled or verified on a device in this environment.

## Checklist

- [x] Jira ticket is marked not provided
- [ ] Acceptance Criteria are met
- [x] Focused self-testing was executed; failure is documented above
- [x] Scoped unit test coverage is reported (100% function coverage)
- [x] Scoped lint check passed
- [ ] Type check passed
- [ ] Husky validation passed
- [ ] Build passed
- [ ] SonarQube Quality Gate passed
- [ ] CI/CD pipeline passed
- [ ] All review comments resolved in GitLab after code review
- [ ] Business migration checklist reviewed and approved
