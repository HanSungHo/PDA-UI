import {
  sendShelfMessage,
  type ShelfMessage,
  shelfMessage,
} from 'src/features/shelf-incoming/services/shelf-incoming.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/api-client', () => ({ default: { post: vi.fn() } }));
const device = { deviceName: 'DEVICE', mobileServerName: 'SERVER' };
beforeEach(() => vi.mocked(apiClient.post).mockReset());
describe('Shelf Incoming message contract', () => {
  it('serializes the complete legacy header, preserves field order and escapes XML', () => {
    const xml = shelfMessage(
      'LOTINSHELF',
      [
        ['INSERTSHELFLOT', 'A|B'],
        ['SHELFNO', '<S&"\'>'],
        ['USERID', 'U'],
      ],
      device,
    );
    expect(xml).toContain(
      '<RECEIVER>SERVER</RECEIVER>\n<SENDER>DEVICE</SENDER>\n<MSGTYPE>P</MSGTYPE>\n<WITHREPLY>YES</WITHREPLY>',
    );
    expect(xml).toContain(
      '<INSERTSHELFLOT>A|B</INSERTSHELFLOT>\n<SHELFNO>&lt;S&amp;&quot;&apos;&gt;</SHELFNO>\n<USERID>U</USERID>',
    );
  });
  it.each(['SHELFCALL', 'CHECKINSHELFLOT', 'LOTINSHELF', 'LOTOUTSHELF'] as ShelfMessage[])(
    'calls the Android endpoint for %s',
    async (name) => {
      const data = { statusCode: 200, result: '{}' };
      vi.mocked(apiClient.post).mockResolvedValue({ data });
      expect(await sendShelfMessage(name, [['LOTID', 'L']], device)).toEqual(data);
      expect(apiClient.post).toHaveBeenCalledWith(
        name === 'SHELFCALL' ? '/hifos/message' : `/hifos/${name.toLowerCase()}`,
        { sMsg: shelfMessage(name, [['LOTID', 'L']], device) },
      );
    },
  );
});
