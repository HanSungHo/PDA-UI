import apiClient from 'src/services/api-client';
import { ApiError } from 'src/services/api-error';

export type MessageBody = Record<string, unknown>;

interface MessageResponse {
  result: string;
}

export interface ParsedMessage {
  STATUS?: string;
  MSGBODY?: MessageBody;
  ERRMSG?: string;
}

export async function postJsonMessage(
  messageName: string,
  payload: Record<string, string>,
): Promise<ParsedMessage> {
  const response = await apiClient.post<MessageResponse>(`/hifos/${messageName}`, payload);
  return JSON.parse(response.data.result) as ParsedMessage;
}

export function assertPass(parsed: ParsedMessage, code: string): void {
  if (parsed.STATUS === 'PASS') return;
  throw new ApiError(parsed.ERRMSG || 'Message failed.', { code });
}

export function body(parsed: ParsedMessage): MessageBody {
  return parsed.MSGBODY ?? {};
}

export function errorMessage(parsed: ParsedMessage): string {
  return parsed.ERRMSG || 'Message failed.';
}

export function text(body: MessageBody, key: string): string {
  const value = body[key];
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function number(body: MessageBody, key: string): number {
  const value = Number(text(body, key));
  return Number.isFinite(value) ? value : 0;
}

export function list(body: MessageBody, key: string): MessageBody[] {
  const value = body[key];
  return Array.isArray(value) ? (value as MessageBody[]) : [];
}

export function firstList(body: MessageBody, keys: string[]): MessageBody[] {
  for (const key of keys) {
    const items = list(body, key);
    if (items.length > 0) return items;
  }
  return [];
}
