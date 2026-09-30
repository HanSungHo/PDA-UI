import apiClient from 'src/services/api-client';
import type { MessageResponseData } from 'src/types/api';

export type MessagePayload = Record<string, string>;

export async function sendMessage(
  messageName: string,
  payload: MessagePayload,
): Promise<MessageResponseData> {
  const response = await apiClient.post<MessageResponseData>('/message/send', {
    messageName,
    payload,
  });

  return response.data;
}
