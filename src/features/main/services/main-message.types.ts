import type { MessageResponseData } from 'src/types/api';

export type MainMessageName = 'login' | 'config';

export interface MainRequestData {
  sMsg: string;
}

export interface MainMessageRequest {
  messageName: MainMessageName;
  payload: MainRequestData;
}

export interface LoginMessagePayload {
  bay: string;
  deviceName: string;
  facility: string;
  mobileServerName: string;
  password: string;
  userId: string;
}

export interface ConfigMessagePayload {
  area: string;
  bay: string;
  deviceName: string;
  facility: string;
  mobileServerName: string;
  operatorId: string;
  wifiIp: string;
}

export interface MainApi {
  sendMessage(request: MainMessageRequest): Promise<MessageResponseData>;
}
