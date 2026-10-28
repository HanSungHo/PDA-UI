export interface ChatMessage {
  roomId: string;
  senderId: string;
  senderIp: string;
  text: string;
  time: string;
  level: string;
}

export interface ChatRoomData {
  messages: ChatMessage[];
  participants: string[];
  recipientIp: string;
  recipientId: string;
}

export interface SendChatMessageRequest {
  sType: 'PRIVATE';
  sArea: string;
  sBay: string;
  recieveIpAddress: string;
  sMsg: string;
  senderIpAddress: string;
  senderId: string;
  roomId: string;
  sLevel: 'NORMAL';
}
