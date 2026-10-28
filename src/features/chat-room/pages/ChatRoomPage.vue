<template>
  <main class="chat-room" :aria-label="roomName || '채팅방'">
    <header class="chat-room__header chat-room__panel">
      <h1 class="chat-room__title">{{ roomName }}</h1>
      <BaseButton
        v-if="roomId"
        class="chat-room__participants-button"
        icon-only
        aria-label="메뉴"
        variant="tertiary"
        @click="isParticipantsOpen = true"
      >
        <QIcon name="sym_o_arrow_drop_down_circle" aria-hidden="true" />
      </BaseButton>
    </header>

    <section class="chat-room__messages chat-room__panel" aria-label="채팅 메시지">
      <ol class="chat-room__message-list">
        <li
          v-for="(message, index) in messages"
          :key="`${message.senderIp}-${message.time}-${index}`"
          class="chat-room__message"
          :class="{
            'chat-room__message--outgoing': message.senderIp === wifiIp,
            'chat-room__message--high': message.level === 'HIGH',
          }"
        >
          <time class="chat-room__message-time">{{ message.time }}</time>
          <p class="chat-room__message-bubble" @contextmenu.prevent="copyMessage(message.text)">
            {{ message.text }}
          </p>
        </li>
      </ol>
    </section>

    <form
      v-if="roomId"
      class="chat-room__composer chat-room__panel"
      aria-label="메시지 작성"
      @submit.prevent="sendMessage"
    >
      <BaseInput
        v-model="input"
        class="chat-room__input"
        aria-label="메시지 입력"
        autocomplete="off"
        placeholder="메시지 입력"
        @update:model-value="filterInput"
      />
      <BaseButton class="chat-room__send" html-type="submit" :disabled="isSending">전송</BaseButton>
    </form>

    <BaseModal
      v-model:open="isParticipantsOpen"
      title="참여자 목록"
      @cancel="isParticipantsOpen = false"
    >
      <ul class="chat-room__participants" aria-label="참여자 목록">
        <li v-for="participant in participants" :key="participant">{{ participant }}</li>
      </ul>
      <template #footer>
        <BaseButton @click="isParticipantsOpen = false">닫기</BaseButton>
      </template>
    </BaseModal>
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton, BaseInput, BaseModal } from 'src/components/base';
import { DeviceInfo } from 'src/constants/device-info';
import { HifosUdpAlarm } from 'src/services/hifos-udp-alarm.plugin';
import { CommonUtil } from 'src/utils/common-util';
import { onBeforeUnmount, onMounted, ref } from 'vue';

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
const wifiIp = ref('');
const recipientIp = ref('');
const isSending = ref(false);
const isParticipantsOpen = ref(false);
let removeChatListener: (() => Promise<void>) | undefined;

function filterInput(value: string | number | undefined) {
  const nextValue = String(value ?? '');
  input.value = /["'&<>]/.test(nextValue) ? acceptedInput.value : nextValue;
  acceptedInput.value = input.value;
}

async function loadChatRoom() {
  wifiIp.value = (await CommonUtil.wifiIpAddress()) ?? '';

  if (!props.roomId) return;

  try {
    const room = await fetchChatRoom(props.roomId, props.roomName);
    messages.value = room.messages;
    participants.value = room.participants;
    recipientIp.value = room.recipientIp;
  } catch {
    messages.value = [];
    participants.value = [];
    recipientIp.value = '';
  }
}

async function sendMessage() {
  const message = input.value;
  if (!message || isSending.value) return;

  isSending.value = true;
  input.value = '';
  acceptedInput.value = '';

  try {
    const request = {
      sType: 'PRIVATE',
      sArea: '',
      sBay: '',
      recieveIpAddress: recipientIp.value,
      sMsg: message,
      senderIpAddress: wifiIp.value,
      senderId: DeviceInfo.OPERATOR_NAME,
      roomId: props.roomId,
      sLevel: 'NORMAL',
    } as const;
    await sendChatMessage(request);
    messages.value.unshift({
      roomId: props.roomId,
      senderId: 'user1',
      senderIp: wifiIp.value,
      text: message,
      time: '',
      level: 'NORMAL',
    });
  } catch {
    // Legacy only logs an asynchronous send failure and leaves the local list unchanged.
  } finally {
    isSending.value = false;
  }
}

async function copyMessage(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard access is optional outside a secure browser context.
  }
}

onMounted(() => {
  if (props.clearMessages) void clearRoomMessages(props.roomName).catch(() => undefined);
  void loadChatRoom();
  void HifosUdpAlarm.addListener('chatMessage', (message) => {
    if (message.roomId !== props.roomId && message.roomName !== props.roomName) return;
    messages.value.push({
      roomId: message.roomId,
      senderId: message.senderId,
      senderIp: message.senderIp,
      text: message.text,
      time: message.time,
      level: message.level,
    });
  })
    .then((listener) => {
      removeChatListener = listener.remove;
    })
    .catch(() => undefined);
});

onBeforeUnmount(() => void removeChatListener?.());
</script>

<style src="../styles/chat-room.css"></style>
