<template>
  <BaseScreen :show-header="false" :show-footer="false" :aria-label="roomName || undefined">
    <header class="ds-screen__card">
      <div class="chat-room__heading">
        <h1 class="chat-room__title">{{ roomName }}</h1>
        <span v-if="roomId" class="chat-room__menu">
          <button
            type="button"
            class="chat-room__menu-button"
            aria-label="메뉴"
            @click="isMenuOpen = true"
          >
            <QIcon name="sym_o_arrow_drop_down_circle" aria-hidden="true" />
          </button>
          <QMenu v-model="isMenuOpen" no-parent-event anchor="bottom right" self="top right">
            <QList>
              <QItem v-close-popup clickable @click="showParticipants">
                <QItemSection>참여자 보기</QItemSection>
              </QItem>
            </QList>
          </QMenu>
        </span>
      </div>
    </header>

    <section ref="messagesEl" class="ds-screen__card chat-room__messages" aria-label="채팅 메시지">
      <ol class="chat-room__message-list">
        <li
          v-for="(message, index) in messages"
          :key="`${message.senderIp}-${message.time}-${index}`"
          class="chat-room__message"
          :class="{
            'chat-room__message--outgoing': localIp !== null && message.senderIp === localIp,
            'chat-room__message--high': message.level === 'HIGH',
          }"
        >
          <p class="chat-room__message-bubble">
            {{ message.text }}
            <QMenu context-menu>
              <QList>
                <QItem v-close-popup clickable @click="copyMessage(message.text)">
                  <QItemSection>복사</QItemSection>
                </QItem>
              </QList>
            </QMenu>
          </p>
          <time class="chat-room__message-time">{{ message.time }}</time>
        </li>
      </ol>
    </section>

    <div v-if="roomId" class="ds-screen__card" role="group" aria-label="메시지 작성">
      <div class="ds-screen__card-row">
        <BaseInput
          :model-value="input"
          aria-label="메시지 입력"
          autocomplete="off"
          placeholder="메시지 입력"
          @update:model-value="filterInput"
        />
        <BaseButton @click="sendMessage">전송</BaseButton>
      </div>
    </div>

    <div v-if="loading" class="chat-room__loading" aria-label="Loading" role="status">
      <BaseLoading />
    </div>

    <BaseModal v-model:open="isParticipantsOpen" title="참여자 목록">
      <ul class="chat-room__participants" aria-label="참여자 목록">
        <li v-for="(participant, index) in participants" :key="`${index}-${participant}`">
          {{ participant }}
        </li>
      </ul>
      <template #footer>
        <BaseButton @click="isParticipantsOpen = false">닫기</BaseButton>
      </template>
    </BaseModal>
    <BaseToast
      v-if="toast"
      :key="toast.id"
      type="success"
      :description="toast.description"
      :closable="false"
      :duration="2000"
      @close="toast = undefined"
    />
  </BaseScreen>
</template>

<script setup lang="ts">
import { ClosePopup as vClosePopup, QIcon, QItem, QItemSection, QList, QMenu } from 'quasar';
import { BaseButton, BaseInput, BaseModal, BaseScreen, BaseToast } from 'src/components/base';
import { BaseLoading } from 'src/components/base/loading';
import { DeviceInfo } from 'src/constants/device-info';
import { CommonUtil } from 'src/utils/common-util';
import { nextTick, onMounted, ref, watch } from 'vue';

import { ipText } from '../../chat-list/services/chat-legacy.service';
import { fetchChatRoom, sendChatMessage } from '../services/chat-room.service';
import { clearRoomMessages } from '../services/chat-room-native.service';
import type { ChatMessage } from '../types/chat-room.types';

const props = withDefaults(
  defineProps<{
    roomId?: string;
    roomName?: string;
    clearMessages?: boolean;
    pdaId?: string;
  }>(),
  { roomId: '', roomName: '', clearMessages: false, pdaId: '' },
);

defineOptions({ name: 'ChatRoomPage' });

const messages = ref<ChatMessage[]>([]);
const participants = ref<string[]>([]);
const input = ref('');
const acceptedInput = ref('');
// CommonUtil.getLocalIpAddress(): null when no non-loopback IPv4 address exists.
const localIp = ref<string | null>(null);
const recipientIp = ref('');
const loading = ref(false);
const isMenuOpen = ref(false);
const isParticipantsOpen = ref(false);
const messagesEl = ref<HTMLElement>();
const toast = ref<{ id: number; description: string }>();
let toastId = 0;

// Legacy InputFilter rejects any edit that contains one of these characters.
function filterInput(value: string | number | undefined) {
  const nextValue = String(value ?? '');
  input.value = nextValue;
  if (!/["'&<>]/.test(nextValue)) {
    acceptedInput.value = nextValue;
    return;
  }
  // Re-render once with the rejected text so the native field is reset to the accepted text.
  void nextTick(() => {
    input.value = acceptedInput.value;
  });
}

let loadToken = 0;

async function loadChatRoom() {
  loadToken += 1;
  const token = loadToken;
  // Android opens a fresh Activity per Intent: reset the per-room state.
  messages.value = [];
  participants.value = [];
  recipientIp.value = '';
  input.value = '';
  acceptedInput.value = '';

  // MessageSender shows a blocking LoadingBar for the room request, so nothing can be sent meanwhile.
  loading.value = true;
  try {
    localIp.value = await CommonUtil.localIpAddress();
    if (!props.roomId) return;
    const room = await fetchChatRoom(props.roomId, props.roomName, localIp.value);
    if (token !== loadToken) return;
    messages.value = room.messages;
    participants.value = room.participants;
    recipientIp.value = room.recipientIp;
  } catch {
    // Legacy keeps the empty room silently when the request fails.
  } finally {
    if (token === loadToken) loading.value = false;
  }
}

async function sendMessage() {
  if (loading.value) return;
  const message = input.value;
  if (!message) return;

  // Legacy clears the field right after enqueueing the request, before the response arrives.
  input.value = '';
  acceptedInput.value = '';

  try {
    const request = {
      sType: 'PRIVATE',
      sArea: '',
      sBay: '',
      recieveIpAddress: recipientIp.value,
      sMsg: message,
      senderIpAddress: ipText(localIp.value),
      senderId: DeviceInfo.OPERATOR_NAME,
      roomId: props.roomId,
      sLevel: 'NORMAL',
    } as const;
    await sendChatMessage(request);
    messages.value.unshift({
      roomId: props.roomId,
      senderId: 'user1',
      senderIp: ipText(localIp.value),
      text: message,
      time: '',
      level: 'NORMAL',
    });
    await nextTick();
    if (messagesEl.value) messagesEl.value.scrollTop = 0;
  } catch {
    // Legacy only logs an asynchronous send failure and leaves the local list unchanged.
  }
}

function showParticipants() {
  isParticipantsOpen.value = true;
}

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard access is optional outside a secure browser context.
  }
  toastId += 1;
  toast.value = { id: toastId, description: '복사되었습니다' };
}

function openRoom() {
  if (props.clearMessages) void clearRoomMessages(props.roomName).catch(() => undefined);
  void loadChatRoom();
}

onMounted(openRoom);

// The router reuses this component when only the query changes; Android starts a new Activity.
watch(() => [props.roomId, props.roomName, props.clearMessages], openRoom);
</script>

<style scoped src="../styles/chat-room.css"></style>
