import type { MessageResponseData } from 'src/types/api';

const STATUS_KEY = 'STATUS';
const PASS_VALUE = 'PASS';
const MESSAGE_BODY_KEY = 'MSGBODY';
const ERROR_MESSAGE_KEY = 'ERRMSG';

export function isResponseSuccessful(response: MessageResponseData): boolean {
  try {
    const result = JSON.parse(response.result) as Record<string, unknown>;

    return response.statusCode === 200 && result[STATUS_KEY] === PASS_VALUE;
  } catch {
    return false;
  }
}

export function parseMessageBody(response: MessageResponseData): Record<string, string> {
  const result = JSON.parse(response.result) as Record<string, unknown>;
  const body = result[MESSAGE_BODY_KEY];

  if (!body || typeof body !== 'object') return {};

  return body as Record<string, string>;
}

export function getResponseErrorMessage(response: MessageResponseData): string {
  try {
    const result = JSON.parse(response.result) as Record<string, unknown>;
    const errorMessage = result[ERROR_MESSAGE_KEY];

    return typeof errorMessage === 'string' ? errorMessage : response.result;
  } catch {
    return response.result;
  }
}
