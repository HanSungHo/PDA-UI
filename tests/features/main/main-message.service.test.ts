import { describe, expect, it, vi } from 'vitest';

import { createMainMessageMockApi } from 'src/features/main/mocks/main-message.mock';
import {
  buildConfigMessage,
  buildLoginMessage,
} from 'src/features/main/services/main-message-payload.helper';
import { mainApi } from 'src/features/main/services/main-message.service';
import {
  getResponseErrorMessage,
  isResponseSuccessful,
  parseMessageBody,
} from 'src/services/message-response.helper';

const { apiClientPostMock } = vi.hoisted(() => ({
  apiClientPostMock: vi.fn(),
}));

vi.mock('src/services/api-client', () => ({
  default: {
    post: apiClientPostMock,
  },
}));

describe('main message service', () => {
  it('posts messages to the real message endpoint', async () => {
    const responseEnvelope = {
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { CONFIG: 'OK' } }),
      statusCode: 200,
    };
    apiClientPostMock.mockResolvedValueOnce({ data: responseEnvelope });

    await expect(
      mainApi.sendMessage({
        messageName: 'config',
        payload: { sMsg: '<SEND><BODY /></SEND>' },
      }),
    ).resolves.toEqual(responseEnvelope);

    expect(apiClientPostMock).toHaveBeenCalledWith('/hifos/config', {
      sMsg: '<SEND><BODY /></SEND>',
    });
  });

  it('returns login data in the same ResponseData envelope used by Kotlin', async () => {
    const api = createMainMessageMockApi();

    const response = await api.sendMessage({
      messageName: 'login',
      payload: {
        sMsg: '<SEND><BODY><OPERATORID>ATOP</OPERATORID><PASSWORD>PASS</PASSWORD></BODY></SEND>',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(isResponseSuccessful(response)).toBe(true);
    expect(parseMessageBody(response)).toEqual(
      expect.objectContaining({
        OPERID: 'ATOP',
        OPERNAME: 'HiFOS DEMO',
        PERMISSTION: 'H',
        GASINPUT: 'N',
      }),
    );
  });

  it('returns the API error message when login is rejected', async () => {
    const api = createMainMessageMockApi();

    const response = await api.sendMessage({
      messageName: 'login',
      payload: {
        sMsg: '<SEND><BODY><OPERATORID>ATOP</OPERATORID><PASSWORD>BAD</PASSWORD></BODY></SEND>',
      },
    });

    expect(isResponseSuccessful(response)).toBe(false);
    expect(getResponseErrorMessage(response)).toBe('아이디 또는 패스워드를 확인해주세요');
  });

  it('builds the config payload used by the login screen config call', () => {
    const payload = buildConfigMessage({
      area: 'AREA',
      bay: 'BAY',
      deviceName: 'PDA',
      facility: 'FAB',
      mobileServerName: 'DEV',
      operatorId: 'ATOP',
      wifiIp: '127.0.0.1',
    });

    expect(payload).toContain('<AIFMSG>');
    expect(payload).toContain('<MSGNAME>CONFIG</MSGNAME>');
    expect(payload).toContain('<RECEIVER>DEV</RECEIVER>');
    expect(payload).toContain('<SENDER>PDA</SENDER>');
    expect(payload).toContain('<MSGTYPE>P</MSGTYPE>');
    expect(payload).toContain('<WITHREPLY>YES</WITHREPLY>');
    expect(payload).toContain('<MSGBODY>');
    expect(payload).toContain('<DEVICENAME>PDA</DEVICENAME>');
    expect(payload).toContain('<IPADDR>127.0.0.1</IPADDR>');
    expect(payload).toContain('<USERID>ATOP</USERID>');
    expect(payload).not.toContain('<IPADDRESS>');
    expect(payload).not.toContain('<OPERATORID>');
    expect(payload).not.toContain('<SERVERNAME>');
  });

  it('builds login payload with the actual device name used by Kotlin', () => {
    const payload = buildLoginMessage({
      bay: 'BAY',
      deviceName: 'PDA-01',
      facility: 'FAB',
      mobileServerName: 'L4-DEVICE',
      password: 'PASS',
      userId: 'ATOP',
    });

    expect(payload).toContain('<MSGNAME>LOGIN</MSGNAME>');
    expect(payload).toContain('<RECEIVER>L4-DEVICE</RECEIVER>');
    expect(payload).toContain('<SENDER>PDA-01</SENDER>');
    expect(payload).toContain('<DEVICENAME>PDA-01</DEVICENAME>');
    expect(payload).toContain('<SERVERNAME>L4-DEVICE</SERVERNAME>');
    expect(payload).not.toContain('<DEVICENAME>PDA</DEVICENAME>');
  });
});
