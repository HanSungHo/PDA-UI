export interface ChatListRoom {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: string;
}

export type ChatListTab = 'chat' | 'pda';

export interface ChatListDevice {
  id: string;
  ip: string;
  bay: string;
  area: string;
  userName: string;
  selected: boolean;
}

export interface ChatListBayNode {
  expanded: boolean;
  selected: boolean;
  devices: ChatListDevice[];
}

export interface ChatListAreaNode {
  expanded: boolean;
  selected: boolean;
  bays: Record<string, ChatListBayNode>;
}

export type ChatListTree = Record<string, ChatListAreaNode>;
