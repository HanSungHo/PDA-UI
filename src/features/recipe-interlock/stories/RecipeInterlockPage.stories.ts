import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { createPinia } from 'pinia';
import { getCurrentInstance } from 'vue';

import RecipeInterlockDialog from '../components/RecipeInterlockDialog.vue';

const sampleXml = `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-06-01T21:37:02.000+09:00</TIME>
        <COL1>val1</COL1>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <MACHINE>EQP-TEST01</MACHINE>
        <LOTID>LOT-20260601</LOTID>
        <REMOTERECIPE>RCP_REMOTE_001</REMOTERECIPE>
        <PROCESSRECIPE>RCP_PROCESS_999</PROCESSRECIPE>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`;

const meta = {
  title: 'Features/Recipe Interlock/Recipe Interlock Dialog',
  component: RecipeInterlockDialog,
  args: { open: true, receiverMessage: sampleXml },
  decorators: [
    (story) => ({
      components: { story },
      template: '<story />',
      setup() {
        getCurrentInstance()?.appContext.app.use(createPinia());
        window.history.replaceState({ back: true, receiverMessage: sampleXml }, '');
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RecipeInterlockDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
