<template>
  <BaseScreen :show-header="false" aria-label="채팅 목록">
    <section
      v-if="activeTab === 'chat'"
      class="ds-screen__card chat-list__panel"
      aria-label="메시지"
      :inert="busy"
    >
      <button
        v-for="room in rooms"
        :key="room.id"
        type="button"
        class="chat-list__room"
        :aria-label="`${room.name}, ${room.unreadCount} unread messages`"
        @click="openChatRoom(room)"
      >
        <span class="chat-list__copy">
          <span class="chat-list__room-name">{{ room.name }}</span>
          <span class="chat-list__last-message">{{ room.lastMessage }}</span>
        </span>
        <span class="chat-list__meta">
          <span class="chat-list__time">{{ room.time }}</span>
          <span
            v-if="room.unreadCount !== '0'"
            class="chat-list__unread"
            :aria-label="`${room.unreadCount} unread messages`"
          >
            {{ room.unreadCount }}
          </span>
        </span>
      </button>
    </section>

    <template v-else>
      <div class="chat-list__pda-scroll" :inert="busy">
        <section
          v-for="(area, areaName) in pdaTree"
          :key="areaName"
          class="ds-screen__card"
          :aria-label="String(areaName)"
        >
          <div class="chat-list__tree-row chat-list__tree-row--area" @click="toggleArea(area)">
            <span class="chat-list__tree-check" @click.stop>
              <BaseCheckbox
                :model-value="area.selected"
                :aria-label="String(areaName)"
                @update:model-value="setAreaSelected(area, $event)"
              />
            </span>
            <span class="chat-list__tree-name">{{ areaName }}</span>
            <BaseButton
              icon-only
              variant="tertiary"
              class="chat-list__tree-toggle"
              :aria-label="`${areaName} ${area.expanded ? '접기' : '펼치기'}`"
            >
              <QIcon
                class="chat-list__tree-icon"
                :name="area.expanded ? 'sym_o_expand_less' : 'sym_o_expand_more'"
                aria-hidden="true"
              />
            </BaseButton>
          </div>
          <template v-if="area.expanded">
            <template v-for="(bay, bayName) in area.bays" :key="bayName">
              <div
                :ref="(row) => setBayRow(String(bayName), row)"
                class="chat-list__tree-row chat-list__tree-row--bay"
                @click="toggleBay(bay)"
              >
                <span class="chat-list__tree-check" @click.stop>
                  <BaseCheckbox
                    :model-value="bay.selected"
                    :aria-label="String(bayName)"
                    @update:model-value="setBaySelected(bay, $event)"
                  />
                </span>
                <span class="chat-list__tree-name">{{ bayName }}</span>
                <BaseButton
                  icon-only
                  variant="tertiary"
                  class="chat-list__tree-toggle"
                  :aria-label="`${bayName} ${bay.expanded ? '접기' : '펼치기'}`"
                >
                  <QIcon
                    class="chat-list__tree-icon"
                    :name="bay.expanded ? 'sym_o_expand_less' : 'sym_o_expand_more'"
                    aria-hidden="true"
                  />
                </BaseButton>
              </div>
              <template v-if="bay.expanded">
                <div
                  v-for="(device, deviceIndex) in bay.devices"
                  :key="`${device.id}-${deviceIndex}`"
                  class="chat-list__tree-row chat-list__tree-device"
                >
                  <BaseCheckbox
                    v-model="device.selected"
                    :aria-label="`${device.id}(${device.userName})`"
                  />
                  <span class="chat-list__tree-name">{{ device.id }}({{ device.userName }})</span>
                </div>
              </template>
            </template>
          </template>
        </section>
        <div class="ds-screen__card chat-list__selection">선택: {{ selectedDevices.length }}</div>
      </div>
      <div class="chat-list__send" :inert="busy">
        <BaseButton size="medium" block :disabled="creatingRoom" @click="sendMessageToDevices"
          >전송</BaseButton
        >
      </div>
    </template>

    <template #footer>
      <nav class="chat-list__navigation" aria-label="주요 탐색" :inert="busy">
        <button
          class="chat-list__nav-item"
          type="button"
          :class="{ 'chat-list__nav-item--active': activeTab === 'pda' }"
          :aria-current="activeTab === 'pda' ? 'page' : undefined"
          @click="selectTab('pda')"
        >
          <QIcon class="chat-list__nav-icon" name="sym_o_phone" aria-hidden="true" />
          <span class="chat-list__nav-label">PDA</span>
        </button>
        <button
          class="chat-list__nav-item"
          type="button"
          :class="{ 'chat-list__nav-item--active': activeTab === 'chat' }"
          :aria-current="activeTab === 'chat' ? 'page' : undefined"
          @click="selectTab('chat')"
        >
          <QIcon class="chat-list__nav-icon" name="sym_o_chat_bubble" aria-hidden="true" />
          <span class="chat-list__nav-label">메시지</span>
        </button>
      </nav>
    </template>

    <div v-if="busy" class="chat-list__loading" aria-label="Loading" role="status">
      <BaseLoading />
    </div>
    <BaseToast
      v-if="toast"
      :key="toast.id"
      type="info"
      :duration="TOAST_SHORT_MS"
      :description="toast.description"
      @close="toast = undefined"
    />
    <BaseModal v-model:open="groupNameDialog" title="채팅방 이름">
      <BaseInput v-model="groupName" placeholder="그룹 이름 입력" />
      <template #footer
        ><BaseButton variant="tertiary" @click="groupNameDialog = false">취소</BaseButton
        ><BaseButton @click="confirmGroupRoom">확인</BaseButton></template
      >
    </BaseModal>
  </BaseScreen>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { QIcon } from 'quasar';
import {
  BaseButton,
  BaseCheckbox,
  BaseInput,
  BaseModal,
  BaseScreen,
  BaseToast,
} from 'src/components/base';
import { BaseLoading } from 'src/components/base/loading';
import { DeviceInfo } from 'src/constants/device-info';
import { CommonUtil } from 'src/utils/common-util';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { resetChatListState, useChatListState } from '../composables/use-chat-list-state';
import {
  createPdaMessageRoom,
  fetchPdaList,
  ipText,
  type LegacyDevice,
} from '../services/chat-legacy.service';
import { fetchChatRooms } from '../services/chat-list.service';
import type {
  ChatListAreaNode,
  ChatListBayNode,
  ChatListRoom,
  ChatListTab,
  ChatListTree,
} from '../types/chat-list.types';

defineOptions({ name: 'ChatListPage' });

// Android Toast.LENGTH_SHORT.
const TOAST_SHORT_MS = 2000;

const rooms = ref<ChatListRoom[]>([]);
const { activeTab, pdaTree, isPdaLoaded, markPdaLoaded } = useChatListState();
const groupNameDialog = ref(false);
const groupName = ref('');
const creatingRoom = ref(false);
// Android LoadingBar (non-dismissable) wraps every MessageSender.send except createPdaMessageRoom.
const pendingRequests = ref(0);
const busy = computed(() => pendingRequests.value > 0);
const toast = ref<{ id: number; description: string }>();
let toastId = 0;
let targetBayRow: HTMLElement | undefined;
let scrollPending = false;
let pendingDevices: LegacyDevice[] = [];
let appStateHandle: { remove: () => Promise<void> } | undefined;
let unmounted = false;
const router = useRouter();
// Android ChatListActivity `private val wifiIp = getLocalIpAddress()`: read once when the Activity
// is created (null when no non-loopback IPv4 address exists) and reused by every request below.
const localIpPromise = CommonUtil.localIpAddress();

async function withLoading<T>(task: () => Promise<T>): Promise<T> {
  pendingRequests.value += 1;
  try {
    return await task();
  } finally {
    pendingRequests.value -= 1;
  }
}

async function refreshChatRooms() {
  try {
    rooms.value = await withLoading(async () => fetchChatRooms(await localIpPromise));
  } catch {
    rooms.value = [];
  }
}

const selectedDevices = computed(() =>
  Object.values(pdaTree.value).flatMap((area) =>
    Object.values(area.bays).flatMap((bay) => bay.devices.filter((device) => device.selected)),
  ),
);
function setSelected(devices: { selected: boolean }[], selected: boolean) {
  devices.forEach((device) => {
    device.selected = selected;
  });
}
function setBaySelected(bay: ChatListBayNode, selected: boolean) {
  bay.selected = selected;
  setSelected(bay.devices, selected);
}
function setAreaSelected(area: ChatListAreaNode, selected: boolean) {
  area.selected = selected;
  Object.values(area.bays).forEach((bay) => setBaySelected(bay, selected));
}
function toggleArea(area: ChatListAreaNode): void {
  area.expanded = !area.expanded;
}
function toggleBay(bay: ChatListBayNode): void {
  bay.expanded = !bay.expanded;
}
function setBayRow(bayName: string, row: unknown) {
  if (bayName === DeviceInfo.BAY) targetBayRow = row instanceof HTMLElement ? row : undefined;
}
async function scrollToTargetBay() {
  await nextTick();
  if (!targetBayRow) return;
  targetBayRow.scrollIntoView?.({ block: 'nearest' });
  scrollPending = false;
}
async function refreshPdas() {
  try {
    const devices = await withLoading(async () => fetchPdaList(await localIpPromise));
    const tree: ChatListTree = {};
    for (const device of devices) {
      const area = (tree[device.area] ??= {
        expanded: device.area === DeviceInfo.AREA,
        selected: false,
        bays: {},
      });
      const bay = (area.bays[device.bay] ??= {
        expanded: device.bay === DeviceInfo.BAY,
        selected: false,
        devices: [],
      });
      bay.devices.push({ ...device, selected: false });
    }
    pdaTree.value = tree;
    markPdaLoaded();
    // Legacy `scrollToPosition(getPositionOfBay(DeviceInfo.BAY))` after the tree is rebuilt.
    scrollPending = true;
    await scrollToTargetBay();
  } catch {
    pdaTree.value = {};
  }
}
async function createRoom(devices: LegacyDevice[], roomName: string) {
  creatingRoom.value = true;
  try {
    // Android `ipAddrList.add(wifiIp.toString())`: a null IP is the literal "null".
    const ipAddrList = [ipText(await localIpPromise), ...devices.map((device) => device.ip)].sort();
    await createPdaMessageRoom({
      roomType: devices.length > 1 ? 'GROUP' : 'PRIVATE',
      roomName,
      ipAddrList,
    });
    activeTab.value = 'chat';
    await refreshChatRooms();
  } catch {
    // Legacy only logs asynchronous create-room failures.
  } finally {
    creatingRoom.value = false;
  }
}
function sendMessageToDevices() {
  if (!selectedDevices.value.length) {
    toast.value = { id: ++toastId, description: '선택된 PDA가 없습니다' };
    return;
  }
  pendingDevices = selectedDevices.value;
  if (pendingDevices.length > 1) {
    groupName.value = '';
    groupNameDialog.value = true;
    return;
  }
  void localIpPromise.then((myIp) =>
    createRoom(pendingDevices, [ipText(myIp), pendingDevices[0].ip].sort().join('_')),
  );
}
function confirmGroupRoom() {
  const name = groupName.value.trim();
  // Legacy AlertDialog always closes on OK; a blank name just creates nothing.
  groupNameDialog.value = false;
  if (!name) return;
  void createRoom(pendingDevices, name);
}

function selectTab(tab: ChatListTab) {
  if (busy.value) return;
  // BottomNavigationView.setOnItemSelectedListener is not invoked for the already selected item.
  if (activeTab.value === tab) return;
  activeTab.value = tab;

  if (tab === 'chat') void refreshChatRooms();
  else if (scrollPending) void scrollToTargetBay();
}

function openChatRoom(room: ChatListRoom) {
  void router.push({
    name: 'chat-room',
    query: {
      roomId: room.id,
      roomName: room.name,
    },
  });
}

// Android onResume: refresh the rooms when the Message tab is selected (app foreground, back from
// ChatRoomActivity). The PDA list is loaded once, in onCreate.
function resume() {
  if (activeTab.value === 'chat') void refreshChatRooms();
}

onBeforeRouteLeave((to) => {
  // The Activity (tab, tree expand/selection) survives only while ChatRoomActivity is on top.
  if (to.name !== 'chat-room') resetChatListState();
});

onMounted(() => {
  resume();
  if (!isPdaLoaded()) void refreshPdas();
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) resume();
  }).then((handle) => {
    if (unmounted) void handle.remove();
    else appStateHandle = handle;
  });
});

onBeforeUnmount(() => {
  unmounted = true;
  void appStateHandle?.remove();
});
</script>

<style src="../styles/chat-list.css"></style>
