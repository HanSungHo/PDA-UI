export interface AlarmRowItem {
  title: string;
  value: string;
}

export interface AlarmCommonPayload {
  id?: string;
  level: string;
  message: string;
  roomName: string;
}
