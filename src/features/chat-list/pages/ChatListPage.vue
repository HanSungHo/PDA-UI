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

    <section v-else class="chat-list__content" aria-label="PDA">
      <div class="chat-list__panel" />
    </section>

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
  </main>
</template>

<script setup lang="ts">
import { QIcon } from 'quasar';
import { BaseButton } from 'src/components/base';
import { onActivated, onMounted, ref } from 'vue';

import { fetchChatRooms } from '../services/chat-list.service';
import type { ChatListRoom } from '../types/chat-list.types';

defineOptions({ name: 'ChatListPage' });

const rooms = ref<ChatListRoom[]>([]);
const activeTab = ref<'chat' | 'pda'>('chat');

async function refreshChatRooms() {
  try {
    rooms.value = await fetchChatRooms();
  } catch {
    rooms.value = [];
  }
}

function selectTab(tab: 'chat' | 'pda') {
  activeTab.value = tab;

  if (tab === 'chat') {
    void refreshChatRooms();
  }
}

onMounted(() => void refreshChatRooms());
onActivated(() => {
  if (activeTab.value === 'chat') {
    void refreshChatRooms();
  }
});
</script>

<style src="../styles/chat-list.css"></style>
