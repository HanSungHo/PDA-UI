import { mount } from '@vue/test-utils';
import RemoteMeasCommentCard from 'src/features/remote-meas/components/RemoteMeasCommentCard.vue';
import RemoteMeasDetailCard from 'src/features/remote-meas/components/RemoteMeasDetailCard.vue';
import type { RemoteMeasLotInfo } from 'src/features/remote-meas/types/remote-meas.types';
import { describe, expect, it } from 'vitest';

const fullLot: RemoteMeasLotInfo = {
  product: 'PRD-01',
  facility: 'FAB2',
  operation: '5100',
  subOperation: '01',
  customer: 'CUST-01',
  category: 'SALE',
  engineer: 'KIM',
  packing: 'BOX',
  quantity: '25',
  goodChips: '25',
  recipe: 'RCP-STD',
  changeRecipe: 'RCP-ALT',
  measEqpId: 'MEQP-01',
  changeEqpGroup: 'GRP-1',
  commentQty: 2,
  nwCommentQty: 1,
  batchId: 'BATCH-01',
  area: 'ETCH',
  workedEqpId: 'EQP-PREV',
  workedRecipe: 'RCP-PREV',
  workedReticle: 'RET-PREV',
  jobCode: 'JOB-01',
  processStep: 'STEP-1',
  opType: 'M',
  status: 'WAIT',
  state: 'WIP',
  holdStatus: 'RELEASE',
  operSequence: '10',
  etcMsg: 'Msg',
  machineName: 'M1',
  portName: 'P1',
  machineRecipeName: 'MR1',
  lotResUser: 'User1',
  reworkFlag: 'N',
  oxMachine: 'OX1',
  skipAllowFlag: 'Y',
};

describe('RemoteMeasDetailCard and RemoteMeasCommentCard', () => {
  it('renders RemoteMeasDetailCard with full lot info', () => {
    const wrapper = mount(RemoteMeasDetailCard, {
      props: {
        lotInfo: fullLot,
      },
      global: {
        stubs: {
          BaseInput: {
            props: ['label', 'modelValue'],
            template: '<div class="input-stub">{{ label }}: {{ modelValue }}</div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('제품명: PRD-01');
    expect(wrapper.text()).toContain('현재공정: STEP-1(510001)');
    expect(wrapper.text()).toContain("담당 Eng'r: KIM");
    expect(wrapper.text()).toContain('수량: 25');
  });

  it('renders RemoteMeasDetailCard with null lot info', () => {
    const wrapper = mount(RemoteMeasDetailCard, {
      props: {
        lotInfo: null,
      },
      global: {
        stubs: {
          BaseInput: {
            props: ['label', 'modelValue'],
            template: '<div class="input-stub">{{ label }}: {{ modelValue }}</div>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('제품명: ');
    expect(wrapper.text()).toContain('현재공정: ');
  });

  it('renders RemoteMeasCommentCard and emits read-comment', async () => {
    const wrapper1 = mount(RemoteMeasCommentCard, {
      props: {
        commentQty: 3,
        nwCommentQty: 1,
        isReadCommentEnabled: true,
        isLoading: false,
      },
      global: {
        stubs: {
          BaseInput: {
            props: ['label', 'modelValue'],
            template:
              '<div class="comment-input-stub">{{ label }}: {{ modelValue }}<slot name="suffix" /></div>',
          },
          BaseButton: {
            props: ['label'],
            template: '<button class="comment-btn" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    });

    expect(wrapper1.find('.comment-input-stub').text()).toContain('3');
    await wrapper1.find('.comment-btn').trigger('click');
    expect(wrapper1.emitted('read-comment')).toBeTruthy();

    const wrapper2 = mount(RemoteMeasCommentCard, {
      props: {
        commentQty: 0,
        nwCommentQty: 0,
        isReadCommentEnabled: false,
        isLoading: false,
      },
      global: {
        stubs: {
          BaseInput: {
            props: ['label', 'modelValue'],
            template:
              '<div class="comment-input-stub">{{ label }}: {{ modelValue }}<slot name="suffix" /></div>',
          },
          BaseButton: true,
        },
      },
    });
    expect(wrapper2.find('.comment-input-stub').text()).toContain('0');
  });
});
