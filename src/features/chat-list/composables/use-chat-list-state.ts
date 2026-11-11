import { ref } from 'vue';

import type { ChatListTab, ChatListTree } from '../types/chat-list.types';

/**
 * Android keeps the ChatListActivity (tab, PDA tree, expand/selection) alive while ChatRoomActivity
 * is open. The Vue page is unmounted on navigation, so that state lives at module level and is
 * dropped again when the user leaves towards anything other than the chat room.
 */
const activeTab = ref<ChatListTab>('chat');
const pdaTree = ref<ChatListTree>({});
let pdaLoaded = false;

export function useChatListState() {
  return {
    activeTab,
    pdaTree,
    isPdaLoaded: () => pdaLoaded,
    markPdaLoaded: () => {
      pdaLoaded = true;
    },
  };
}

export function resetChatListState(): void {
  activeTab.value = 'chat';
  pdaTree.value = {};
  pdaLoaded = false;
}
