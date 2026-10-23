# Activity Chat List — Android Legacy → Vue3 Migration Review

## 1. Screen Dependencies

### 1.1 Related Screens

| Dependency Type        | Screen/Class             | Relationship                                                      | Migration Impact                                           |
| ---------------------- | ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Parent Screen          | `MainActivity`           | Opens `ChatListActivity` from `btnChat`.                          | Existing Vue `/chat` route must preserve the inbound flow. |
| Result Receiver Screen | None identified          | `ChatListActivity` does not call `setResult()`.                   | No result contract is required.                            |
| Dialog                 | Group-name `AlertDialog` | Requests and validates the group name before creating a chatroom. | Excluded together with the group-room creation flow.       |

## 2. Function Mapping

| Old Function            | Purpose / Main Logic                                                        | Vue Function                          |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| `onCreate`              | Initializes navigation, room list, PDA data, adapters, and event listeners. | `onMounted`; PDA workflow excluded    |
| `onResume`              | Refreshes the room list when the Chat tab is selected.                      | `onActivated` → `refreshChatRooms`    |
| `refreshChatTab`        | Requests the latest room data and refreshes the room adapter.               | `refreshChatTab` → `refreshChatRooms` |
| `getRoomList`           | Requests room `ITEMS` and maps them into the room list.                     | `getRoomList` → `fetchChatRooms`      |
| `getPdaList`            | Requests and maps selectable `PDAS`.                                        | Excluded                              |
| `sendMessageToDevices`  | Determines whether to create a private or group chatroom.                   | Excluded                              |
| `showGroupNameDialog`   | Displays the group-name dialog and validates that the name is not empty.    | Excluded                              |
| `createPrivateChatroom` | Sends a request to create a private chatroom.                               | Excluded                              |
| `createGroupChatroom`   | Sends a request to create a group chatroom.                                 | Excluded                              |
| `openChatRoom`          | Opens `ChatRoomActivity` with `roomId` and `roomName`.                      | Excluded                              |
| `buildTreeFromDevices`  | Transforms PDA data into an area, bay, and device selection tree.           | Excluded                              |

## 3. Event Mapping

| Android Event                         | Purpose                                                    | Vue Equivalent                                      |
| ------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `BottomNavigationView`: Chat selected | Displays the Chat view and refreshes the room list.        | `selectTab('chat')` + `refreshChatRooms()`          |
| `BottomNavigationView`: PDA selected  | Displays the selectable PDA tree.                          | PDA tab/panel display only; selection flow excluded |
| `RecyclerView` room item click        | Opens `ChatRoomActivity` for the selected room.            | Excluded                                            |
| PDA checkbox change                   | Updates selected PDA devices and selected count.           | Excluded                                            |
| `FloatingActionButton` click          | Creates or sends to a private/group room using selections. | Excluded                                            |
| Group-name dialog confirmation        | Validates the group name and creates a group chatroom.     | Excluded                                            |
| Group-name dialog cancellation        | Closes the dialog without creating a room.                 | Excluded                                            |

## 4. API Mapping

| Legacy Message/API                         | Purpose                              | Vue Service                                             |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------------- |
| `MessageName.NEWPDALIST` + `getPdaMessage` | Obtains chatroom `ITEMS`.            | Scoped mock `GET /mock/chat-rooms` via `fetchChatRooms` |
| `MessageName.NEWPDALIST` + `newPdaList`    | Obtains selectable `PDAS`.           | Excluded                                                |
| `RetrofitSyncService.API.createPdaMessage` | Creates a private or group chatroom. | Excluded                                                |

## 5. Legacy → Vue Function Dictionary

| Legacy Android            | Vue Migration                                             |
| ------------------------- | --------------------------------------------------------- |
| `ChatListActivity`        | `ChatListPage.vue`                                        |
| `onCreate`                | `onMounted`                                               |
| `onResume`                | `onActivated`                                             |
| `RecyclerView`            | Room list rendered using `v-for`                          |
| `ChatRoomAdapter`         | Room-row rendering inside `ChatListPage.vue`              |
| Kotlin coroutine          | Async `fetchChatRooms`                                    |
| `BottomNavigationView`    | Semantic `<nav>` with tab buttons                         |
| `item_chat_room`          | `BaseButton` room-row template                            |
| `TextView`                | `BaseLabel` or semantic text element                      |
| Room item click listener  | Excluded                                                  |
| `ChatRoomActivity` intent | Excluded                                                  |
| `TreeAdapter`             | Excluded                                                  |
| Group-name `AlertDialog`  | Excluded                                                  |
| `FloatingActionButton`    | Excluded                                                  |
| `RetrofitSyncService`     | Mock chat-room service                                    |
| `setResult`               | Not applicable; no result handling exists                 |
| `finish`                  | No explicit Vue equivalent required for the scoped screen |

## 6. Variables / State Mapping

| Legacy Variable                 | Purpose                                               | Vue State                               |
| ------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| `chatAdapter` room data         | Stores and displays chatrooms.                        | `chatAdapter` → `rooms`                 |
| Selected bottom-navigation item | Identifies the current Chat or PDA mode.              | `activeTab`                             |
| Room `ITEMS`                    | Contains room data returned by the room-list request. | `rooms`                                 |
| `UNREAD_COUNT`                  | Controls unread-badge content and visibility.         | Room item `UNREAD_COUNT` / unread state |
| `deviceList`                    | Stores selectable PDA devices.                        | Excluded                                |
| `ipAddrList`                    | Stores selected PDA IP addresses.                     | Excluded                                |
| `treeAdapter`                   | Manages the PDA selection tree.                       | Excluded                                |
| `selectedCountText`             | Displays the selected PDA count.                      | Excluded                                |
| `wifiIp`                        | Supports legacy message and room-name logic.          | Excluded                                |
| Group-name input                | Stores the private/group room name.                   | Excluded                                |

## 7. UI Component Mapping

| XML Component            | Purpose                                            | Vue Equivalent                                        |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| `RecyclerView`           | Displays the chatroom list.                        | `chat-list__panel` with `v-for` room rows             |
| `item_chat_room`         | Displays room name, timestamp, and unread count.   | `BaseButton` room-row template                        |
| Room-name `TextView`     | Displays the chatroom name.                        | `BaseLabel` or semantic text element                  |
| Time `TextView`          | Displays the room metadata timestamp.              | `BaseLabel` or semantic `<time>` element              |
| Unread-count `TextView`  | Displays unread count when the value is not `"0"`. | Conditional unread badge using `v-if`                 |
| `BottomNavigationView`   | Switches between PDA and Chat modes.               | Semantic `<nav>` with Message and PDA tab buttons     |
| PDA tab item             | Displays the PDA panel.                            | Native semantic tab button                            |
| Chat tab item            | Displays and refreshes the Chat panel.             | Native semantic tab button                            |
| PDA selection tree       | Displays area, bay, and device selections.         | Panel present; interactive selection flow excluded    |
| PDA device `CheckBox`    | Selects devices for chatroom creation.             | Excluded; preferred component would be `BaseCheckbox` |
| `sendLayout`             | Displays the selected-device send controls.        | Excluded                                              |
| `FloatingActionButton`   | Starts private/group room creation.                | Excluded; preferred component would be `BaseButton`   |
| Group-name `AlertDialog` | Collects and validates a group name.               | Excluded; preferred component would be `BaseDialog`   |
| Group-name `EditText`    | Accepts the group name.                            | Excluded; preferred component would be `BaseInput`    |

## 8. Navigation Mapping

| Android Navigation                    | Purpose                                       | Vue Equivalent                             |
| ------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| `MainActivity` → `ChatListActivity`   | Opens the Chat List screen.                   | Existing `/chat` route                     |
| Bottom navigation → Chat              | Switches to the room list and refreshes data. | `selectTab('chat')` + `refreshChatRooms()` |
| Bottom navigation → PDA               | Switches to the PDA panel.                    | PDA tab selection; business flow excluded  |
| `openChatRoom` → `ChatRoomActivity`   | Opens a room using `roomId` and `roomName`.   | Excluded                                   |
| `Intent` extras: `roomId`, `roomName` | Passes the selected room context.             | Excluded                                   |
| `startActivity`                       | Navigates from the room list to room detail.  | Excluded                                   |
| `startActivityForResult`              | No usage identified for the current screen.   | Not applicable                             |
| `setResult`                           | No usage identified in the legacy screen.     | Not applicable                             |
| `finish`                              | Closes the legacy activity.                   | Router back behavior if required           |

## 9. Business Rules Summary

- The Message/Chat tab is selected by default when the screen is initialized.
- The room list is loaded when the Vue page is mounted.
- When the kept-alive Vue page becomes active and the Message tab is selected, the room list is refreshed.
- Returning from the PDA tab to the Message tab refreshes the room list.
- Legacy refreshes the room list through `onResume` when the Chat tab is selected.
- Room data is obtained from legacy `ITEMS`; the scoped Vue implementation uses `GET /mock/chat-rooms`.
- An unread badge is displayed only when legacy `UNREAD_COUNT` is not exactly `"0"`.
- When `UNREAD_COUNT` is exactly `"0"`, the unread badge must not be rendered.
- Failed room-list retrieval produces an empty room list, matching the legacy outcome.
- The room list uses a 12px outer gutter and 70px room-row height.
- The metadata column uses a 43px width.
- The unread/error badge uses a 24px size.
- The room list remains full-width and must not introduce horizontal overflow.
- The screen uses the project font token resolved to `Noto Sans KR`.
- Selecting a room and opening `ChatRoomActivity` is excluded from the approved scope.
- PDA device selection and selected-count behavior are excluded.
- Validation message `선택된 PDA가 없습니다` is excluded with the PDA selection flow.
- Private and group chatroom creation are excluded.
- Group-name input and non-empty validation are excluded.
- `roomId` and `roomName` navigation parameters are excluded because room navigation is not implemented.
- The current migration is not a complete 1:1 migration because PDA selection, room creation, and room-detail navigation remain excluded.

## 10. Migration Checklist

| Status | Item                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| [ ]    | All dependent screens migrated — `ChatRoomActivity` excluded by scope             |
| [x]    | Parent screen and inbound route identified                                        |
| [x]    | All Intent parameters reviewed — no inbound Intent parameters identified          |
| [x]    | All variables migrated — PDA and room-creation states excluded                    |
| [x]    | All API calls migrated — only the scoped room-list mock API is implemented        |
| [x]    | Room-list API response handling migrated                                          |
| [x]    | Empty room-list failure outcome migrated                                          |
| [ ]    | All events migrated — room and PDA events excluded                                |
| [ ]    | All validations migrated — only the unread-zero rule is implemented               |
| [ ]    | All dialogs migrated — group-name dialog excluded                                 |
| [ ]    | All navigation logic migrated — only the entry route is implemented               |
| [x]    | All result handling reviewed — no legacy `setResult()` handling exists            |
| [ ]    | All RecyclerView logic migrated — only room-list rendering is implemented         |
| [ ]    | All Adapter logic migrated — row navigation excluded                              |
| [ ]    | All UI enable/disable logic migrated — PDA selection controls excluded            |
| [ ]    | All selection logic migrated — only Chat/PDA tab selection is implemented         |
| [ ]    | All data transformation logic migrated — only room `ITEMS` mapping is implemented |
| [ ]    | All business rules migrated within the approved scope                             |
| [ ]    | Legacy feature coverage fully verified                                            |
| [ ]    | 1:1 migration verified against Android source                                     |
