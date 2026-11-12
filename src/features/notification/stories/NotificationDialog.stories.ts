import type { Meta, StoryObj } from '@storybook/vue3-vite';

import NotificationDialog from '../components/NotificationDialog.vue';

/** Cells are joined by "</": 0 time, 2 eqpid, 3 lotId, 6 level, 7 desc */
function buildAlarmMessage(level: string): string {
  const cells = [
    '<T>2026-09-28T13:08:19+09:00',
    '<X>x',
    '<E>ETCH-01',
    '<L>LOT-A260928',
    '<A>a',
    '<B>b',
    `<V>${level}`,
    '<D>foo;공정 파라미터를 확인해 주세요',
  ];
  return `INTERLOCKMANAGER<Table diffgr:${cells.join('</')}`;
}

const meta = {
  title: 'Features/Notification/Notification Dialog',
  component: NotificationDialog,
  args: {
    modelValue: true,
    inboundParams: { UDP_RECEIVER_MESSAGE: buildAlarmMessage('1') },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NotificationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Alarm message with the level chip, EQPID/TIME/LOTID/DESC lines */
export const AlarmLevel1: Story = {};

export const AlarmLevel3: Story = {
  args: { inboundParams: { UDP_RECEIVER_MESSAGE: buildAlarmMessage('3') } },
};

/** Plain text message: no chip is rendered */
export const PlainMessage: Story = {
  args: { inboundParams: { UDP_RECEIVER_MESSAGE: 'Plain notification message' } },
};
