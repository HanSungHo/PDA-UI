import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { useNotification } from '~/features/notification/composables/useNotification';
import type { NotificationInboundParams } from '~/features/notification/types/notification.types';

interface RowOptions {
  time?: string;
  eqpid?: string;
  lotId?: string;
  level?: string;
  desc?: string;
}

// Build one "<Table diffgr:" row. Cells are joined by "</" and the composable reads
// index 0 (time), 2 (eqpid), 3 (lotId), 6 (level), 7 (desc).
function buildRow(o: RowOptions = {}): string {
  const {
    time = '2024-01-05T10:20:30+09:00',
    eqpid = 'EQP01',
    lotId = 'LOT01',
    level = '1',
    desc = 'foo;Reason : overheat',
  } = o;
  const cells = [
    `<T>${time}`,
    '<X>x',
    `<E>${eqpid}`,
    `<L>${lotId}`,
    '<A>a',
    '<B>b',
    `<V>${level}`,
    `<D>${desc}`,
  ];
  return '<Table diffgr:' + cells.join('</');
}

const buildMessage = (...rows: string[]) => 'INTERLOCKMANAGER' + rows.join('');

function setup(initial: NotificationInboundParams | undefined, onFinish?: () => void) {
  const state = { params: initial };
  let api!: ReturnType<typeof useNotification>;
  const Comp = defineComponent({
    setup() {
      api = useNotification(() => state.params, onFinish);
      return () => h('div');
    },
  });
  const wrapper = mount(Comp);
  return { api, state, wrapper };
}

describe('useNotification', () => {
  describe('onCreate - plain message', () => {
    it('shows a non INTERLOCKMANAGER message as is', () => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: 'hello world' });
      expect(api.receiverMessage.value).toBe('hello world');
      expect(api.viewBinding.txtReceiverMessage.text).toBe('hello world');
      expect(api.viewBinding.titleReceiverMessage.text).toBe('');
    });

    it('sets receiverMessage to null when params are undefined', () => {
      const { api } = setup(undefined);
      expect(api.receiverMessage.value).toBeNull();
      expect(api.viewBinding.txtReceiverMessage.text).toBe('');
    });

    it('sets receiverMessage to null when the key is missing', () => {
      const { api } = setup({});
      expect(api.receiverMessage.value).toBeNull();
    });

    it('keeps null when the message is explicitly null', () => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: null });
      expect(api.receiverMessage.value).toBeNull();
      expect(api.viewBinding.txtReceiverMessage.text).toBe('');
    });
  });

  describe('onCreate - INTERLOCKMANAGER alarm', () => {
    it('builds title and body for a normal alarm', () => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: buildMessage(buildRow()) });

      expect(api.asmError.value).toBe(false);
      expect(api.viewBinding.titleReceiverMessage.text).toBe('#ALARM#');
      expect(api.eqpid.value).toBe('EQP01');
      expect(api.lotId.value).toBe('LOT01');
      expect(api.time.value).toBe('2024-01-05T10:20:30+09:00');
      expect(api.parsedDate.value).toBeInstanceOf(Date);
      expect(api.formattedTime.value).toBe('2024-01-05 10:20:30');
      expect(api.parsedGroups.value).toHaveLength(2);
      expect(api.parsedAlarm.value.length).toBeGreaterThan(7);

      const text = api.viewBinding.txtReceiverMessage.text;
      expect(text).toContain('\nEQPID: EQP01');
      expect(text).toContain('\n\nTIME: 2024-01-05 10:20:30');
      expect(text).toContain('\n\nLOTID: LOT01');
      expect(text).toContain('DESC: overheat');
    });

    it('parses the description parts and takes the value after the last colon cell', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ desc: 'foo;Reason : overheat' })),
      });
      expect(api.description.value).toBe('foo;Reason : overheat');
      expect(api.descriptionParts.value).toEqual(['foo', 'Reason : overheat']);
      expect(api.lastDescriptionPart.value).toBe('Reason : overheat');
      expect(api.descriptionValue.value).toBe('overheat');
      expect(api.viewBinding.txtReceiverMessage.text).toContain(
        '\n\n DESC: overheat\n\n------------------------',
      );
    });

    it('uses the whole last part when it has no colon', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ desc: 'only text' })),
      });
      expect(api.descriptionValue.value).toBe('only text');
    });

    it('decodes html entities in the description', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ desc: 'Temp &gt; 100 : x' })),
      });
      expect(api.description.value).toBe('Temp > 100 : x');
      expect(api.descriptionValue.value).toBe('x');
    });

    it('keeps only the text after the last ">" of the cell (same as Kotlin)', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ desc: 'a<br>b : x' })),
      });
      expect(api.description.value).toBe('b : x');
    });

    it.each([
      ['1', 'rgb(239, 181, 81)'],
      ['2', '#0000FF'],
      ['3', '#FF0000'],
      ['9', ''],
    ])('maps alarm level %s to color %s', (level, color) => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ level })) });
      expect(api.alarmLevel.value).toBe(level);
      expect(api.viewBinding.titleReceiverMessage.textColor).toBe(color);
    });

    it('leaves the level empty when the level cell is empty', () => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ level: '' })) });
      expect(api.alarmLevel.value).toBe('');
      expect(api.viewBinding.titleReceiverMessage.textColor).toBe('');
    });

    it('skips empty eqpid, time, lotId and description', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(buildRow({ eqpid: '', time: '', lotId: '', desc: '' })),
      });
      const text = api.viewBinding.txtReceiverMessage.text;
      expect(text).not.toContain('EQPID');
      expect(text).not.toContain('TIME');
      expect(text).not.toContain('LOTID');
      expect(text).not.toContain('DESC');
      expect(api.formattedTime.value).toBe('');
      expect(api.parsedDate.value).toBeNull();
    });

    it('handles rows with missing cells without throwing', () => {
      const msg = 'INTERLOCKMANAGER<Table diffgr:<T>2024-01-05T10:20:30Z</<X>x';
      const { api } = setup({ UDP_RECEIVER_MESSAGE: msg });
      expect(api.eqpid.value).toBe('');
      expect(api.lotId.value).toBe('');
      expect(api.description.value).toBe('');
      expect(api.alarmLevel.value).toBe('');
    });

    it('appends one block per row', () => {
      const { api } = setup({
        UDP_RECEIVER_MESSAGE: buildMessage(
          buildRow({ eqpid: 'EQP01' }),
          buildRow({ eqpid: 'EQP02' }),
        ),
      });
      const text = api.viewBinding.txtReceiverMessage.text;
      expect(text).toContain('EQPID: EQP01');
      expect(text).toContain('EQPID: EQP02');
      expect(api.eqpid.value).toBe('EQP02');
    });

    it('does nothing for rows when the message has no table rows', () => {
      const { api } = setup({ UDP_RECEIVER_MESSAGE: 'INTERLOCKMANAGER only header' });
      expect(api.viewBinding.titleReceiverMessage.text).toBe('');
      expect(api.viewBinding.txtReceiverMessage.text).toBe('');
      expect(api.parsedGroups.value).toHaveLength(1);
    });
  });

  describe('onCreate - ASML error', () => {
    it('shows the mask message without alarm title', () => {
      const msg = buildMessage(buildRow({ eqpid: 'EQP09' })).replace(
        'INTERLOCKMANAGER',
        'INTERLOCKMANAGER ALARM_ID    : 1414725736 ',
      );
      const { api } = setup({ UDP_RECEIVER_MESSAGE: msg });

      expect(api.asmError.value).toBe(true);
      expect(api.viewBinding.titleReceiverMessage.text).toBe('');
      const text = api.viewBinding.txtReceiverMessage.text;
      expect(text).toContain('[EQP09] Mask 없음');
      expect(text).toContain('\nTIME: 2024-01-05 10:20:30');
      expect(text).not.toContain('EQPID');
    });
  });

  describe('onCreate - re-invocation', () => {
    it('resets state and re-parses when params change', () => {
      const { api, state } = setup({ UDP_RECEIVER_MESSAGE: buildMessage(buildRow()) });
      expect(api.viewBinding.titleReceiverMessage.text).toBe('#ALARM#');

      state.params = { UDP_RECEIVER_MESSAGE: 'plain' };
      api.onCreate();

      expect(api.viewBinding.titleReceiverMessage.text).toBe('');
      expect(api.viewBinding.titleReceiverMessage.textColor).toBe('');
      expect(api.viewBinding.txtReceiverMessage.text).toBe('plain');
      expect(api.parsedGroups.value).toEqual([]);
      expect(api.parsedAlarm.value).toEqual([]);
      expect(api.alarmLevel.value).toBe('');
      expect(api.update.value).toBe(false);
    });
  });

  describe('finish / back / click', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('onBackPressed returns true', () => {
      const { api } = setup({});
      expect(api.onBackPressed()).toBe(true);
    });

    it('finish calls the callback', () => {
      const cb = vi.fn();
      const { api } = setup({}, cb);
      api.finish();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('finish does not throw without a callback', () => {
      const { api } = setup({});
      expect(() => api.finish()).not.toThrow();
    });

    it('singleClickListener ignores rapid repeated clicks (300ms debounce)', () => {
      const cb = vi.fn();
      const { api } = setup({}, cb);

      api.singleClickListener.onSingleClick();
      api.singleClickListener.onSingleClick();
      expect(cb).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      api.singleClickListener.onSingleClick();
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('singleClickListener does nothing when the button is disabled', () => {
      const cb = vi.fn();
      const { api } = setup({}, cb);
      api.viewBinding.btnOk.isEnabled = false;
      api.singleClickListener.onSingleClick();
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
