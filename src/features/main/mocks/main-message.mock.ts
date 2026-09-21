import type { MessageResponseData } from 'src/types/api';

import type { MainApi, MainMessageRequest } from '../services/main-message.types';

const STATUS_KEY = 'STATUS';
const PASS_VALUE = 'PASS';
const FAIL_VALUE = 'FAIL';
const MESSAGE_BODY_KEY = 'MSGBODY';
const ERROR_MESSAGE_KEY = 'ERRMSG';

export interface MainMessageMockApi extends MainApi {
  getRequests(): MainMessageRequest[];
}

export function createMainMessageMockApi(): MainMessageMockApi {
  const requests: MainMessageRequest[] = [];

  return {
    getRequests() {
      return [...requests];
    },
    sendMessage(request) {
      requests.push(request);

      if (request.messageName === 'login') {
        return Promise.resolve(createLoginResponse(request.payload.sMsg));
      }

      return Promise.resolve(createPassResponse({ CONFIG: 'OK' }));
    },
  };
}

function createLoginResponse(sendMessage: string): MessageResponseData {
  const operatorId = readXmlValue(sendMessage, 'OPERATORID') || 'DEMO';
  const password = readXmlValue(sendMessage, 'PASSWORD');

  if (password !== 'PASS') {
    return createFailResponse('아이디 또는 패스워드를 확인해주세요');
  }

  return createPassResponse({
    GASINPUT: 'N',
    OPERID: operatorId,
    OPERNAME: 'HiFOS DEMO',
    PERMISSTION: 'H',
  });
}

function createPassResponse(messageBody: Record<string, string>): MessageResponseData {
  return {
    result: JSON.stringify({
      [STATUS_KEY]: PASS_VALUE,
      [MESSAGE_BODY_KEY]: messageBody,
    }),
    statusCode: 200,
  };
}

function createFailResponse(errorMessage: string): MessageResponseData {
  return {
    result: JSON.stringify({
      [STATUS_KEY]: FAIL_VALUE,
      [ERROR_MESSAGE_KEY]: errorMessage,
      [MESSAGE_BODY_KEY]: '',
    }),
    statusCode: 200,
  };
}

function readXmlValue(source: string, tagName: string): string {
  const pattern = new RegExp(`<${tagName}>(.*?)</${tagName}>`);
  const match = pattern.exec(source);

  return match?.[1] ?? '';
}
