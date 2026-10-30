<template>
  <main class="chat-list" aria-label="채팅 목록">
    <section v-if="activeTab === 'chat'" class="chat-list__content" aria-label="메시지">
      <div class="chat-list__panel">
        <BaseButton
          v-for="room in rooms"
          :key="room.id"
          class="chat-list__room"
          size="medium"
          variant="tertiary"
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
        </BaseButton>
      </div>
    </section>

    <section v-else class="chat-list__content chat-list__content--pda" aria-label="PDA">
      <div class="chat-list__pda-tree">
        <template v-for="(area, areaName) in pdaTree" :key="areaName">
          <section class="chat-list__tree-card" :aria-label="String(areaName)">
            <div class="chat-list__tree-row chat-list__tree-row--area">
              <BaseCheckbox
                :model-value="area.selected"
                :label="String(areaName)"
                @update:model-value="setAreaSelected(area, $event)"
              />
              <BaseButton
                icon-only
                variant="tertiary"
                class="chat-list__tree-toggle"
                :aria-label="`${areaName} ${area.expanded ? '접기' : '펼치기'}`"
                @click="toggleArea(area)"
              >
                <QIcon
                  :name="area.expanded ? 'sym_o_expand_less' : 'sym_o_expand_more'"
                  aria-hidden="true"
                />
              </BaseButton>
            </div>
            <template v-if="area.expanded">
              <template v-for="(bay, bayName) in area.bays" :key="bayName">
                <div class="chat-list__tree-row chat-list__tree-row--bay">
                  <BaseCheckbox
                    :model-value="bay.selected"
                    :label="String(bayName)"
                    @update:model-value="setBaySelected(bay, $event)"
                  />
                  <BaseButton
                    icon-only
                    variant="tertiary"
                    class="chat-list__tree-toggle"
                    :class="{ 'chat-list__tree-toggle--white': !bay.expanded }"
                    :aria-label="`${bayName} ${bay.expanded ? '접기' : '펼치기'}`"
                    @click="toggleBay(bay)"
                  >
                    <QIcon
                      :name="bay.expanded ? 'sym_o_expand_less' : 'sym_o_expand_more'"
                      aria-hidden="true"
                    />
                  </BaseButton>
                </div>
                <template v-if="bay.expanded">
                  <BaseCheckbox
                    v-for="device in bay.devices"
                    :key="device.id"
                    v-model="device.selected"
                    class="chat-list__tree-device"
                    :label="`${device.id}(${device.userName})`"
                  />
                </template>
              </template>
            </template>
          </section>
        </template>
        <div class="chat-list__selection">선택: {{ selectedDevices.length }}</div>
      </div>
    </section>
    <div v-if="activeTab === 'pda'" class="chat-list__pda-send">
      <BaseButton
        class="chat-list__send-button"
        :disabled="creatingRoom"
        @click="sendMessageToDevices"
        >전송</BaseButton
      >
    </div>

    <nav class="chat-list__navigation" aria-label="주요 탐색">
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
    <BaseModal v-model:open="groupNameDialog" title="채팅방 이름">
      <BaseInput v-model="groupName" placeholder="그룹 이름 입력" />
      <template #footer
        ><BaseButton variant="tertiary" @click="groupNameDialog = false">취소</BaseButton
        ><BaseButton @click="confirmGroupRoom">확인</BaseButton></template
      >
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseCheckbox, BaseInput, BaseModal } from 'src/components/base';
import { DeviceInfo } from 'src/constants/device-info';
import { CommonUtil } from 'src/utils/common-util';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  createPdaMessageRoom,
  fetchPdaList,
  type LegacyDevice,
} from '../services/chat-legacy.service';
import { fetchChatRooms } from '../services/chat-list.service';
import type { ChatListRoom } from '../types/chat-list.types';

defineOptions({ name: 'ChatListPage' });

const rooms = ref<ChatListRoom[]>([]);
const activeTab = ref<'chat' | 'pda'>('chat');
const pdaTree = ref<
  Record<
    string,
    {
      expanded: boolean;
      selected: boolean;
      devices: LegacyDevice[];
      bays: Record<
        string,
        { expanded: boolean; selected: boolean; devices: (LegacyDevice & { selected: boolean })[] }
      >;
    }
  >
>({});
const groupNameDialog = ref(false);
const groupName = ref('');
const creatingRoom = ref(false);
let pendingDevices: LegacyDevice[] = [];
const router = useRouter();

async function refreshChatRooms() {
  try {
    rooms.value = await fetchChatRooms();
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
function setBaySelected(
  bay: { selected: boolean; devices: { selected: boolean }[] },
  selected: boolean,
) {
  bay.selected = selected;
  setSelected(bay.devices, selected);
}
function setAreaSelected(
  area: {
    selected: boolean;
    bays: Record<string, { selected: boolean; devices: { selected: boolean }[] }>;
  },
  selected: boolean,
) {
  area.selected = selected;
  Object.values(area.bays).forEach((bay) => setBaySelected(bay, selected));
}
function toggleArea(area: { expanded: boolean }): void {
  area.expanded = !area.expanded;
}
function toggleBay(bay: { expanded: boolean }): void {
  bay.expanded = !bay.expanded;
}
async function refreshPdas() {
  try {
    const wifiIp = (await CommonUtil.wifiIpAddress()) ?? '';
    const devices = await fetchPdaList(wifiIp);
    const tree: typeof pdaTree.value = {};
    for (const device of devices) {
      const area = (tree[device.area] ??= {
        expanded: device.area === DeviceInfo.AREA,
        selected: false,
        devices: [],
        bays: {},
      });
      area.devices.push(device);
      const bay = (area.bays[device.bay] ??= {
        expanded: device.bay === DeviceInfo.BAY,
        selected: false,
        devices: [],
      });
      bay.devices.push({ ...device, selected: false });
    }
    pdaTree.value = tree;
  } catch {
    pdaTree.value = {};
  }
}
async function createRoom(devices: LegacyDevice[], roomName: string) {
  creatingRoom.value = true;
  try {
    const myIp = (await CommonUtil.wifiIpAddress()) ?? '';
    const ipAddrList = [myIp, ...devices.map((device) => device.ip)].sort();
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
  if (!selectedDevices.value.length) return;
  pendingDevices = selectedDevices.value;
  if (pendingDevices.length > 1) {
    groupName.value = '';
    groupNameDialog.value = true;
    return;
  }
  void CommonUtil.wifiIpAddress().then((myIp) =>
    createRoom(pendingDevices, [myIp ?? '', pendingDevices[0].ip].sort().join('_')),
  );
}
function confirmGroupRoom() {
  const name = groupName.value.trim();
  if (!name) return;
  groupNameDialog.value = false;
  void createRoom(pendingDevices, name);
}

function selectTab(tab: 'chat' | 'pda') {
  activeTab.value = tab;

  if (tab === 'chat') {
    void refreshChatRooms();
  }
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

onMounted(() => void refreshChatRooms());
onMounted(() => void refreshPdas());
onActivated(() => {
  if (activeTab.value === 'chat') {
    void refreshChatRooms();
  }
});
</script>

<style src="../styles/chat-list.css"></style>
