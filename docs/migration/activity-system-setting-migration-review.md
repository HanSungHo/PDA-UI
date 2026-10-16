# activity_system_setting.xml → Vue review

## 1. Screen dependencies

| Type            | Legacy                                             | Vue                                   | Status  |
| --------------- | -------------------------------------------------- | ------------------------------------- | ------- |
| Parent/receiver | `MainActivity` opens `SystemSettingDialogActivity` | `/system-setting` → `/main`           | Covered |
| Dialog          | `OkCancelDialog`, `OkDialog`, Toast                | `BaseModal`, `BaseToast`              | Covered |
| Native bridge   | Download service, Android Back callback            | `HifosSystemSetting` Capacitor plugin | Covered |

## 2. Function mapping

| Legacy function            | Vue function                             |
| -------------------------- | ---------------------------------------- |
| `onCreate`                 | `onMounted`                              |
| `passwordCheck`            | `passwordCheck`                          |
| `systemSettingOK`          | `systemSettingOK`                        |
| `saveServerInfo`           | `saveServerInfo`                         |
| `getServerInfo`            | `getServerInfo`                          |
| `downLoadBatterMonitor`    | `downLoadBatterMonitor`                  |
| `downLoadPmdm`             | `downLoadPmdm`                           |
| `finish` / `onBackPressed` | `finish` / `onBackPressed` + route guard |

## 3. Events

| Legacy event          | Vue equivalent                                  |
| --------------------- | ----------------------------------------------- |
| Password Change       | `onSingleClick('btnPassword')`                  |
| OK / Close            | `onSingleClick('btnOk'/'btnClose')`             |
| Battery / PDMA        | `onSingleClick('btnBatteryDown'/'btnPmdmDown')` |
| Android Back / Escape | native event + `keydown` listener               |

## 4. API mapping

| Legacy API                              | Vue service                                     |
| --------------------------------------- | ----------------------------------------------- |
| `checkAliveServer` → `GET /hifos/check` | `checkAPI` with 10s timeout                     |
| Room `ServerInfoService` read/write     | `server-config.service` local storage           |
| `RetrofitSyncService.reInit`            | `useMainStore().applyServerInfo` + API base URL |
| DownloadService                         | `downloadApk` native/browser bridge             |

## 5. State mapping

| Legacy                         | Vue                                 |
| ------------------------------ | ----------------------------------- |
| `editPassword`                 | `editPassword`                      |
| `layoutServerInfo.visibility`  | `layoutServerInfo`                  |
| `radioServer1/2`               | `form.selectedServer`               |
| `editProdServer/editDevServer` | `form.editProdServer/editDevServer` |
| `ServerType`                   | server constants + main store       |

## 6. UI mapping

| XML                  | Vue                              |
| -------------------- | -------------------------------- |
| `edit_password`      | BaseInput `edit-password`        |
| `layout_server_info` | conditional `layout-server-info` |
| RadioButton          | BaseRadio                        |
| Server EditText      | BaseInput                        |
| Buttons              | BaseButton                       |
| Dialogs              | BaseModal/BaseToast              |

## 7. Navigation/result

- Android Back is blocked while this dialog is open; Vue uses the native callback and route guard.
- Close returns to the previous route, or `/main` when there is no history.
- Successful save shows the acknowledgement dialog before leaving.

## 8. Business rules

- Exact password is `hifos`; any other value hides server info and disables OK.
- Server selection is exclusive; selected host is checked before persistence.
- Non-200 or network failure leaves persisted/runtime server state unchanged.
- PROD update URL always uses the PROD host; mobile URL uses the selected host.
- Downloads are blocked while another download/save/load is active.
- Legacy hidden PDMA action remains wired but not visible.

## 9. Data/side-effect order

1. Read persisted server records.
2. Require exact password.
3. Show confirmation dialog.
4. Check selected host.
5. Persist both PROD/DEV records.
6. Apply runtime server/API base URLs.
7. Show success acknowledgement.
8. Navigate back only after acknowledgement.

## 10. Migration checklist

| Status | Item                                           |
| ------ | ---------------------------------------------- |
| ☑      | Parent/receiver navigation                     |
| ☑      | Password and visibility rules                  |
| ☑      | Server selection and normalization             |
| ☑      | `/hifos/check` validation                      |
| ☑      | Persistence and runtime application            |
| ☑      | Confirmation/error/success dialogs             |
| ☑      | Android Back and Escape behavior               |
| ☑      | Battery/PDMA download paths                    |
| ☑      | Loading/double-click guards                    |
| ☑      | Exact HTML modal geometry and responsive width |
| ☑      | Unit/mock/API/native tests                     |
| ☑      | 1:1 legacy review complete                     |
