# Android Legacy → Vue 3 Migration Review: EEN Add

**Review date:** 2026-09-29  
**Review status:** Functional migration is present; 1:1 parity is not signed off until the gaps in section 9 are resolved or accepted.

**Evidence reviewed:** [EENAddActivity.kt](../../ATSOP26.SMART/hifos2/app/src/main/java/com/keyfoundry/hifos/view/esheet/een/EENAddActivity.kt), [activity_een_add.xml](../../ATSOP26.SMART/hifos2/app/src/main/res/layout/activity_een_add.xml), [ESheetActivity.kt](../../ATSOP26.SMART/hifos2/app/src/main/java/com/keyfoundry/hifos/view/esheet/ESheetActivity.kt), [MessageFactoryUtil.kt](../../ATSOP26.SMART/hifos2/app/src/main/java/com/keyfoundry/hifos/config/utils/MessageFactoryUtil.kt), and the Vue implementation in [EenAddPage.vue](../src/features/een-add/pages/EenAddPage.vue), [use-een-add.ts](../src/features/een-add/composables/use-een-add.ts), and the EEN Add service/message factory. The redesigned HTML reference is [activity_een_add.html](../../activity_een_add.html).

## 1. Screen Dependencies

### 1.1 Related Screens

| Dependency Type        | Screen/Class                        | Relationship                                                                                                                                                                                                               | Migration Impact                                                                                                      |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Parent Screen          | `ESheetActivity` → `ESheetPage.vue` | ESheet opens EEN Add from a draw-menu row only when `COMMENTCNT == "0"`; it supplies LOT, facility, product, route, operation, and process step.                                                                           | Preserve the inbound field names and operation formatting. Vue passes them as route query values.                     |
| Result Receiver Screen | `ESheetActivity` → `ESheetPage.vue` | Android launches for result. On `RESULT_OK`, ESheet refreshes the currently entered LOT; it does not read the returned Intent data. Vue publishes a LOTID in the EEN store, then ESheet consumes it and searches that LOT. | Preserve success-only refresh and verify whether the returned LOTID is intended to override the current LOT.          |
| Dialog                 | `OkDialog`                          | Used for API errors, validation messages, and insert success.                                                                                                                                                              | Migrated to EEN Add `BaseModal` alert state. Check copy and close timing.                                             |
| Dialog                 | `OkCancelDialog`                    | Confirms insert using `BTNYESSTR` / `BTNNOSTR` (`예` / `아니오`).                                                                                                                                                          | Migrated to the page's `BaseModal` confirm state. Current button copy is `확인` / `취소`, not legacy `예` / `아니오`. |

No other business-screen dependency is identified in the reviewed EEN Add flow.

## 2. Function Mapping

| Old Function                                     | Purpose / Main Logic                                                                                                | Vue Function                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `onCreate()`                                     | Binds the screen, reads Intent extras, configures listeners, then loads tag/route/action-point options.             | `useEenAdd()` state initialization and `onMounted()` calling `loadTagIds()` / `loadRoutes()` |
| `setSpinnerRoute()`                              | Requests process flows, builds route options, and selects the response's `PROCESSFLOWNAME`.                         | `loadRoutes()`                                                                               |
| `setSpinnerTag()`                                | Requests `TAGLIST`, reports an API error, and converts the tag string.                                              | `loadTagIds()`                                                                               |
| `setSpinnerTag(dataList)`                        | Creates `SpinnerItem` rows from ID/comment pairs and installs the adapter.                                          | `parseTagList()` and `tagOptions`                                                            |
| `itemSelectListener.onItemSelected()`            | Copies selected tag comment; reloads operations on route change; updates operation description on operation change. | `onTagChange()`, `loadOperations()`, and computed `processDescription`                       |
| `itemSelectListener.onNothingSelected()`         | No-op.                                                                                                              | No equivalent; dropdown state may become `undefined`.                                        |
| `setSpinnerProcessOperation()`                   | Requests operations for the selected route and restores the incoming operation when present.                        | `loadOperations()`                                                                           |
| `spinnerRoute(itemList)`                         | Installs the route adapter.                                                                                         | `routeOptions` assignment in `loadRoutes()`                                                  |
| `spinnerProcessOperation(itemList)`              | Installs the operation adapter.                                                                                     | `operationOptions` assignment in `loadOperations()`                                          |
| `spinnerActionPoint()`                           | Installs fixed action points `MOVEIN`, `MOVEOUT`, `MOVEIN/OUT`.                                                     | `ACTION_POINTS` and `actionPointOptions`                                                     |
| `addWaferNumber()`                               | Requests wafer positions and prepends `#` plus comma-separated positions to comment.                                | `addWaferNumber()`                                                                           |
| `addEenMessage()`                                | Validates fields, asks for confirmation, sends `INSERTEEN`, then displays success/error.                            | `validate()` → `submit()` → `confirmSubmit()`                                                |
| `onSingleClickListener.onSingleClick()`          | Dispatches confirm, cancel, and W/F number buttons.                                                                 | Vue form/button event bindings to `submit()`, `cancel()`, and `addWaferNumber()`             |
| `ESheetActivity.activityResultLauncher` callback | On `RESULT_OK`, refreshes ESheet and restores LOT input focus.                                                      | `consumeReturnLotId()` in `ESheetPage.vue` followed by `searchLot()`                         |

## 3. Event Mapping

| Android Event                  | Purpose                                                | Vue Equivalent                                                                  |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `btn_confirm` click            | Start validation and insert confirmation flow.         | Form `@submit.prevent="submit"`; `BaseModal` confirm calls `confirmSubmit()`    |
| `btn_cancel` click             | Hide keyboard and finish without a result.             | Cancel/back button calls `cancel()` → `router.back()`                           |
| `btnWaferNo` click             | Fetch wafer positions and update comment.              | `@click="addWaferNumber"`                                                       |
| Route spinner selection        | Clear/reload operation list for selected process flow. | `BaseDropdownList @change="loadOperations"`                                     |
| Operation spinner selection    | Update operation description.                          | `selectedOperationOption` / computed `processDescription`                       |
| Tag spinner selection          | Replace comment with selected tag's comment.           | `BaseDropdownList @change="onTagChange"`                                        |
| Action-point spinner selection | Change the selected action point.                      | `v-model:model-value="selectedActionPoint"`                                     |
| `OkCancelDialog` result        | Cancel insert or continue.                             | Confirm-mode `BaseModal`; cancel clears dialog, confirm calls `confirmSubmit()` |
| `OkDialog` confirm             | Close alert/success dialog.                            | Alert-mode `BaseModal`; `closeDialog()` runs any close callback                 |
| Keyboard visibility            | Scrolls Android `ScrollView` by keyboard height.       | Browser page/viewport scrolling; no explicit Vue keyboard-visibility callback   |
| System back                    | Leave Activity.                                        | Vue router back navigation                                                      |

No EEN Add barcode-scan, Enter-key, long-click, RecyclerView-item, or adapter callback event was found.

## 4. API Mapping

| Legacy Message/API                            | Purpose                                                                                            | Vue Service                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GETPROCESSFLOW` (`getProcessFlow`)           | Load process flows by `FACTORYNAME`, `PRODUCT`, and `PROCESSOPER`.                                 | `eenService.getProcessFlow()` → `/hifos/message`; payload from `getProcessFlow()`           |
| `GETPROCESSOPERATION` (`getProcessOperation`) | Load operations by `FACTORYNAME`, `PRODUCT`, and `PROCESSFLOW`.                                    | `eenService.getProcessOperation()` → `/hifos/message`; payload from `getProcessOperation()` |
| `GETTAGID` (`getTagId`)                       | Load `TAGLIST` by facility.                                                                        | `eenService.getTagId()` → `/hifos/gettagid`; payload from `getTagId()`                      |
| `GETTAGPOSITION` (`getTagPosition`)           | Load wafer `POSITION` values by `LOTNAME`.                                                         | `eenService.getTagPosition()` → `/hifos/gettagposition`; payload from `getTagPosition()`    |
| `INSERTEEN` (`insertEen`)                     | Insert EEN with LOT, user, facility, product, operation, action point, route, comment, and tag ID. | `eenService.insertEen()` → `/hifos/inserteen`; payload from `insertEen()`                   |

Vue response handling normalizes message status/body through `message-response.helper`; no separate Request or Response sections are required for this mapping.

## 5. Legacy → Vue Function Dictionary

| Legacy Android                                    | Vue Migration                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `EENAddActivity`                                  | `EenAddPage.vue` + `useEenAdd()`                                                                       |
| Activity lifecycle (`onCreate`)                   | `onMounted()` initialization; `onUnmounted()` resets the active service                                |
| Intent extras                                     | Vue Router query values (`LOTID`, `FACTORYNAME`, `PRODUCT`, `ROUTE`, `OPERATION`, `PROCESSSTEP`)       |
| `Bundle` / saved state                            | No EEN-specific saved-state bundle behavior found; values are initialized from route query/store       |
| `ActivityEenAddBinding`                           | Vue template bindings to `context`, refs, and handlers                                                 |
| `ScrollView`                                      | Scrollable web page around the fixed-width EEN screen                                                  |
| `Spinner` + `ArrayAdapter` + `InitSpinnerAdapter` | `BaseDropdownList` with typed option arrays                                                            |
| EEN-local `RecyclerView` / `GridLayoutManager`    | Not present in `EENAddActivity`; parent ESheet process-grid interaction remains in `ESheetProcessGrid` |
| EEN-local adapter callbacks                       | Not present beyond spinner adapters; selection behavior maps to Vue dropdown events                    |
| `OkDialog` / `OkCancelDialog`                     | `BaseModal` alert/confirm modes                                                                        |
| `TextView`                                        | Read-only `BaseInput`, field labels, and page heading                                                  |
| `EditText` (`edit_comment`)                       | `BaseInput` in `textarea` mode                                                                         |
| `Button` and `OnSingleClickListener`              | `BaseButton` plus Vue event handlers/loading state                                                     |
| Spinner selection state                           | `selectedRoute`, `selectedOperation`, `selectedActionPoint`, `selectedTagId` refs                      |
| `CoroutineScope` / `launch`                       | `async` service/composable functions and promises                                                      |
| `MessageFactoryUtil` + `MessageSender`            | `een-add.message-factory.ts` + `een-add.service.ts` / `apiClient`                                      |
| `startActivityForResult`                          | `router.push()` to EEN Add                                                                             |
| `setResult(RESULT_OK, LOTID)` / `finish()`        | `setReturnLotId()` then success-dialog close/back; ESheet `consumeReturnLotId()` and `searchLot()`     |

## 6. Variables / State Mapping

| Legacy Variable                                    | Purpose                                                                               | Vue State                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `lotId`                                            | LOT supplied to EEN Add and wafer-position lookup.                                    | `context.lotId`                                                                        |
| `factoryname`                                      | Facility used by process/tag APIs and insert.                                         | `context.facility`                                                                     |
| `product`                                          | Product used by process APIs and insert.                                              | `context.product`                                                                      |
| `operation`                                        | Incoming operation code used for process-flow lookup and initial operation selection. | `context.operation`; consumed when selecting `selectedOperation`                       |
| `processStep`                                      | Incoming process description fallback.                                                | `context.processStep`; `processDescription` fallback                                   |
| `route`                                            | Incoming route value; Activity stores it but does not explicitly select it.           | `context.route`; currently not used to select `selectedRoute`                          |
| `operSeq`                                          | `OPERSEQUENCE` extra read by Activity; no subsequent use found.                       | `context.operSequence`; currently unused                                               |
| `viewBinding`                                      | Bound Android controls.                                                               | Vue template and refs                                                                  |
| `keyboardVisibilityUtils`                          | Scrolls `sv_root` when keyboard appears.                                              | Browser viewport/page scroll; no direct state counterpart                              |
| `mainScope`                                        | Main-thread coroutine launches.                                                       | Async composable methods                                                               |
| `ioScope`                                          | Declared but unused in reviewed Activity.                                             | No counterpart required                                                                |
| `spinnerRouteItems`, `spinnerOperationItems`       | API-derived spinner options.                                                          | `routeOptions`, `operationOptions`                                                     |
| `tagListStr`, `dataList`, `itemList`               | Parsed tag rows and adapter data.                                                     | `response.messageBody.TAGLIST`, `parseTagList()`, `tagOptions`                         |
| `selectedProcessFlow`, operation selection         | Selected route/operation.                                                             | `selectedRoute`, `selectedOperation`, `selectedOperationOption`                        |
| `tagComment` / `editComment`                       | Tag-derived and user-edited comment.                                                  | `comment`                                                                              |
| `positionList`                                     | Returned wafer positions.                                                             | Local `positions` in `addWaferNumber()`                                                |
| `sendMessage`, `message`, `result`, `isSuccessFul` | Request/result and success state.                                                     | Service call result (`EenAddResponse`) with `isSuccess`, `messageBody`, `errorMessage` |
| `returnCode`                                       | Confirmation dialog result.                                                           | `dialogMode` plus `cancelDialog()` / `confirmSubmit()`                                 |
| `returnIntent`                                     | Result Intent containing `LOTID`.                                                     | EEN store `setReturnLotId()` / `consumeReturnLotId()`                                  |
| `DeviceInfo.OPERATOR_ID`                           | Insert user ID.                                                                       | `mainStore.operatorId`                                                                 |
| `loading`, route/operation loading                 | Vue request/interaction status; Android has no matching per-request loading refs.     | `loading`, `routeLoading`, `operationLoading`                                          |

## 7. UI Component Mapping

| XML Component                               | Purpose                                           | Vue Equivalent                                            |
| ------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| `ScrollView` (`sv_root`)                    | Allows form scrolling and keyboard adjustment.    | `.een-add-screen` page scrolling                          |
| `txt_title`                                 | EEN Add heading.                                  | `<h1>` heading                                            |
| LOT ID label + `txt_lot_id`                 | Display incoming LOT.                             | `BaseInput` readonly, label `LOT ID`                      |
| FACILITY label + `txt_facility`             | Display incoming facility.                        | `BaseInput` readonly, label `FACILITY`                    |
| 제품 label + `txt_product`                  | Display incoming product.                         | `BaseInput` readonly, label `제품`                        |
| ROUTE label + `spinner_route`               | Select process flow.                              | `BaseDropdownList` with `routeOptions`                    |
| 공정 label + `spinner_operation`            | Select operation.                                 | `BaseDropdownList` with `operationOptions`                |
| 공정 DESC label + `txt_operation_desc`      | Show selected operation description/process step. | Readonly `BaseInput` from `processDescription`            |
| ACTION POINT label + `spinner_action_point` | Select one of three fixed action points.          | `BaseDropdownList` from `ACTION_POINTS`                   |
| TAG ID label + `spinner_tag_id`             | Select tag and associated comment.                | `BaseDropdownList` with `tagOptions`                      |
| `btnWaferNo`                                | Append wafer numbers to comment.                  | `BaseButton` calling `addWaferNumber()`                   |
| `edit_comment`                              | Enter/edit tag comment.                           | `BaseInput` textarea bound to `comment`                   |
| `btn_confirm` / `btn_cancel`                | Submit or leave screen.                           | Footer `BaseButton`s                                      |
| Divider `View`                              | Footer separator.                                 | Current CSS footer layout; no behavior-specific component |
| `OkDialog` / `OkCancelDialog`               | Alerts and insert confirmation.                   | EEN-scoped `BaseModal`                                    |

The current Vue screen follows the supplied redesigned HTML reference; it is not a pixel-level port of the legacy Android XML layout.

## 8. Navigation Mapping

| Android Navigation                                                     | Purpose                                                                                                       | Vue Equivalent                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ESheet `Intent` to `EENAddActivity`                                    | Passes `LOTID`, `FACTORYNAME`, `PRODUCT`, `ROUTE`, `OPERATION` (`OPERATION-SUBOPERATION`), and `PROCESSSTEP`. | `ESheetPage.handleDrawMenuAction()` calls `router.push()` with matching query keys.                                                            |
| `OPERSEQUENCE` read in `onCreate()`                                    | Extra is not passed by the reviewed ESheet caller and is unused in EEN Add.                                   | `context.operSequence` can read a query value but ESheet does not send it; no business effect currently.                                       |
| EEN cancel → `finish()`                                                | Leaves without `RESULT_OK`.                                                                                   | `cancel()` calls `router.back()` without setting return LOTID.                                                                                 |
| EEN insert success → `setResult(RESULT_OK, returnIntent)` + `finish()` | Returns `LOTID` in result Intent; parent refreshes on result code.                                            | `confirmSubmit()` sets one-shot LOTID in the Pinia store; after success alert closes it navigates back; ESheet consumes LOTID and searches it. |
| ESheet `ActivityResultLauncher` callback                               | On `RESULT_OK`, calls `searchData(editLotNo)`; ignores `it.data` / returned extra.                            | ESheet currently uses the store LOTID for `lotInput` and `searchLot()`.                                                                        |

## 9. Business Rules Summary

- EEN Add is exposed from ESheet only when the selected process row has `COMMENTCNT == "0"`; otherwise ESheet opens EEN setting instead.
- `GETPROCESSFLOW` uses facility, product, and incoming operation. The selected initial route is the response's `PROCESSFLOWNAME`; the incoming `ROUTE` extra is not explicitly applied in legacy code or current Vue code.
- Changing route reloads the available operations. The incoming operation is matched by its first code token and then cleared so it is not reapplied on later route changes.
- `TAGLIST` is newline-delimited and tab-separated. Column 0 is the TAG ID/value; column 1 is the comment. Selecting a tag replaces the current comment with its configured comment.
- `GETTAGPOSITION` produces an ordered `#` prefix with comma-separated `POSITION` values, concatenated directly before the existing comment (no separator is added).
- Insert validation requires a selected route, operation, action point, and non-empty comment. It does not require a selected TAG ID and does not trim the comment before checking emptiness.
- Before `INSERTEEN`, facility, product, and route are trimmed; operation is the first token of the selected operation; action point, comment, selected tag ID, LOTID, and operator ID are passed as insert fields.
- Cancel does not produce a result; successful insert returns LOTID and triggers the parent screen refresh.
- The Android Activity launches tag and route loading through `mainScope`; route loading can trigger operation loading. Vue currently starts tag and route loading concurrently with `Promise.all`.

### Migration Findings Requiring Confirmation

| Priority | Finding                                                                                                                                                                                 | Impact / Decision                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Medium   | Android confirm labels are `예` / `아니오`; current Vue labels are `확인` / `취소`.                                                                                                     | Confirm whether redesigned copy is approved; event behavior maps to continue/cancel, but text is not 1:1. |
| Medium   | Legacy `insertEen` accepts nullable `tagId`; if no tag is selected, Kotlin interpolation sends `TAGID` as the string `null`. Vue sends an empty string.                                 | Confirm backend contract for empty tag list / no selection; align payload deliberately.                   |
| Medium   | Android silently clears route/operation lists on unsuccessful responses and swallows exceptions in those loaders. Vue shows error dialogs for unsuccessful responses and thrown errors. | Decide whether improved Vue error reporting is intentional or strict parity is required.                  |
| Medium   | Legacy success calls `OkDialog.show()`, then immediately sets result and finishes. Vue waits for the success alert to close before navigating back.                                     | Validate expected dialog visibility and parent refresh timing with QA.                                    |
| Low      | Android uses `OnSingleClickListener`; Vue uses loading state and disables some controls only after insert begins.                                                                       | Verify duplicate-tap behavior while validation/confirmation is open.                                      |
| Low      | Android keyboard utility explicitly scrolls by keyboard height; Vue relies on browser/WebView scrolling.                                                                                | Verify Android WebView behavior on small screens and with the keyboard open.                              |

## 10. Migration Checklist

| Status | Item                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| [x]    | All dependent screens migrated (ESheet parent exists in Vue)                                                                         |
| [x]    | All Intent parameters migrated; `OPERSEQUENCE` is unused and not sent by the legacy caller                                           |
| [~]    | All variables migrated; `ioScope` is unused and some route/sequence state is currently inert                                         |
| [x]    | All API calls migrated                                                                                                               |
| [~]    | All API response handling migrated; route/operation failure behavior differs                                                         |
| [x]    | All events migrated                                                                                                                  |
| [x]    | All validations migrated                                                                                                             |
| [~]    | All dialogs migrated; confirm labels and success-close timing differ                                                                 |
| [x]    | All navigation logic migrated                                                                                                        |
| [~]    | All result handling migrated; Vue uses a store contract instead of Activity result data                                              |
| [x]    | All RecyclerView logic migrated (no EEN-local RecyclerView exists)                                                                   |
| [x]    | All Adapter logic migrated to Vue option arrays/BaseDropdownList                                                                     |
| [~]    | All UI enable/disable logic migrated; loading/single-click semantics need QA confirmation                                            |
| [~]    | All business rules migrated; confirm the findings above                                                                              |
| [x]    | Legacy feature coverage verified: 47 EEN Add unit tests pass; scoped coverage is 100% statements/functions/lines and 94.87% branches |
| [ ]    | 1:1 migration verified against Android source; pending the parity decisions/findings above                                           |
