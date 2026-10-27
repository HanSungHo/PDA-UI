import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { createPinia } from 'pinia';
import { getCurrentInstance } from 'vue';

import PremptyDialog from '../components/PremptyDialog.vue';

const sampleXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-10-26T09:15:30.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>2</ALARMLEVEL>
        <EQPID>EQP-PUMP-01</EQPID>
        <MODEL>MODEL-A</MODEL>
        <FACILITY>FAC-01</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-001</PUMPID>
        <PUMPNAME>MAIN PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_ALARM] Pump ready empty detected</DESC>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

const multiAlarmXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-10-26T09:15:30.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>2</ALARMLEVEL>
        <EQPID>EQP-PUMP-01</EQPID>
        <MODEL>MODEL-A</MODEL>
        <FACILITY>FAC-01</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-001</PUMPID>
        <PUMPNAME>MAIN PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_ALARM] Pump ready empty detected</DESC>
      </Table>
      <Table diffgr:id="Table1" msdata:rowOrder="1">
        <TIME>2026-10-26T09:16:00.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>3</ALARMLEVEL>
        <EQPID>EQP-PUMP-02</EQPID>
        <MODEL>MODEL-B</MODEL>
        <FACILITY>FAC-02</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-002</PUMPID>
        <PUMPNAME>SUB PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_WARN] Secondary pump warning</DESC>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

const meta = {
  title: 'Features/Prempty/Prempty Dialog',
  component: PremptyDialog,
  args: { open: true, receiverMessage: sampleXml },
  decorators: [
    (story) => ({
      components: { story },
      template: '<story />',
      setup() {
        getCurrentInstance()?.appContext.app.use(createPinia());
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PremptyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single alarm — all fields populated */
export const Default: Story = {};

/** Two alarm entries concatenated — tests the parse loop in usePREmpty */
export const MultiAlarm: Story = {
  args: { open: true, receiverMessage: multiAlarmXml },
};
