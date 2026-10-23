import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import RemoteImpBatch from '~/features/remote_imp_batch/pages/RemoteImpBatch.vue';

const createState = () => ({
  txtIngMachine: ref('IMP-EQ-01'),
  txtRecipe: ref('RCP-IMP-01'),
  chkCarry: ref(false),
  selectedBay: ref(''),
  selectedStk: ref(''),
  bayOptions: ref([{ label: 'BAY-A', value: 'BAY-A' }]),
  stkOptions: ref([{ label: 'STK-A', value: 'STK-A' }]),
  isSpinnerBayEnabled: ref(true),
  isSpinnerStkEnabled: ref(true),
  isBtnStartEnabled: ref(true),
  ports: ref([
    {
      id: 1,
      label: 'PORT 1',
      lotId: 'LOT-01',
      product: 'PROD-1',
      jobCode: 'JOB-1',
      operation: '3100-00',
      qty: '25',
      isSearchDisabled: false,
      isCommentEnabled: true,
      isReadonlyInput: false,
    },
    {
      id: 2,
      label: 'PORT 2',
      lotId: '',
      product: '',
      jobCode: '',
      operation: '',
      qty: '',
      isSearchDisabled: false,
      isCommentEnabled: true,
      isReadonlyInput: false,
    },
  ]),
  editLot2Ref: ref<{ focus: () => void } | null>(null),
  checkChangeListener: vi.fn(),
  itemSelectedListener: vi.fn(),
  editorActionListener: vi.fn(),
  onSingleClick: vi.fn(),
  onLotInputUpdate: vi.fn(),
  messageModalOpen: ref(false),
  messageModal: ref({ title: '', message: '', isConfirm: false }),
  handleModalConfirm: vi.fn(),
  handleModalCancel: vi.fn(),
});

let mockState = createState();

vi.mock('~/features/remote_imp_batch/composables/useRemoteImpBatch', () => ({
  useRemoteImpBatch: () => mockState,
}));

const stubs = {
  BaseInput: {
    template: `
<input
        class="base-input"
        :value="modelValue"
        :readonly="readonly"
        :aria-label="$attrs['aria-label']"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    `,
    props: ['modelValue', 'readonly'],
    methods: {
      focus: vi.fn(),
    },
  },
  BaseButton: {
    template: `
<button
        class="base-btn"
        :disabled="disabled"
        :aria-label="$attrs['aria-label']"
        @click="$emit('click')"
>
        {{ label }}
</button>
    `,
    props: ['label', 'disabled'],
  },
  BaseCheckbox: {
    template: `
<input
        type="checkbox"
        class="base-checkbox"
        :checked="modelValue"
        :aria-label="$attrs['aria-label']"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
    `,
    props: ['modelValue', 'label'],
  },
  BaseDropdownList: {
    template: `
<select
        class="base-select"
        :disabled="disabled"
        :aria-label="$attrs['aria-label']"
        @change="$emit('update:modelValue', $event.target.value)"
>
<option value=""></option>
<option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
</select>
    `,
    props: ['modelValue', 'options', 'disabled'],
  },
  BaseModal: {
    template: `
<div v-if="open" class="base-modal">
<h2>{{ title }}</h2>
<button class="modal-close" @click="$emit('update:open', false)">x</button>
<slot />
</div>
    `,
    props: ['open', 'title'],
  },
};

const mountPage = () => mount(RemoteImpBatch, { global: { stubs } });

describe('RemoteImpBatch page', () => {
  beforeEach(() => {
    mockState = createState();
  });

  it('1. renders headers and port cards', () => {
    const text = mountPage().text();
    expect(text).toContain('진행 장비 선택');
    expect(text).toContain('진행 LOT 정보');
    expect(text).toContain('PORT 1');
    expect(text).toContain('PORT 2');
  });

  it('2. LOT input updates and Enter key on port 2', async () => {
    const wrapper = mountPage();
    const cards = wrapper.findAll('.card-lot');
    const lot1 = cards[0].find('input.base-input');
    const lot2 = cards[1].find('input.base-input');

    await lot1.setValue('LOT-MOD-1');
    expect(mockState.onLotInputUpdate).toHaveBeenCalledWith(1, 'LOT-MOD-1');

    await lot2.setValue('LOT-MOD-2');
    expect(mockState.onLotInputUpdate).toHaveBeenCalledWith(2, 'LOT-MOD-2');

    await lot2.trigger('keyup.enter');
    expect(mockState.editorActionListener).toHaveBeenCalled();
  });

  it('2b. Enter key on port 1 does not trigger editorActionListener', async () => {
    const wrapper = mountPage();
    const lot1 = wrapper.findAll('.card-lot')[0].find('input.base-input');
    await lot1.trigger('keyup.enter');
    expect(mockState.editorActionListener).not.toHaveBeenCalled();
  });

  it('2c. machine and recipe inputs write back to state (v-model)', async () => {
    const wrapper = mountPage();
    const [machine, recipe] = wrapper.findAll('.card-product-info input.base-input');

    await machine.setValue('IMP-EQ-02');
    expect(mockState.txtIngMachine.value).toBe('IMP-EQ-02');

    await recipe.setValue('RCP-IMP-02');
    expect(mockState.txtRecipe.value).toBe('RCP-IMP-02');
  });

  it('3. clicking action buttons dispatches onSingleClick', async () => {
    const wrapper = mountPage();
    const btns = wrapper.findAll('button.base-btn');

    await btns[0].trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_search_port1');
    await btns[1].trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_comment_read1');
    await btns[2].trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_search_port2');
    await btns[3].trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_comment_read2');
    await btns.find((b) => b.text().includes('START'))!.trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_start');
    await btns.find((b) => b.text().includes('취소'))!.trigger('click');
    expect(mockState.onSingleClick).toHaveBeenCalledWith('btn_cancel');
  });

  it('3b. START button is disabled when isBtnStartEnabled is false', () => {
    mockState.isBtnStartEnabled.value = false;
    const wrapper = mountPage();
    const start = wrapper.findAll('button.base-btn').find((b) => b.text().includes('START'))!;
    expect(start.attributes('disabled')).toBeDefined();
  });

  it('4. carry checkbox and BAY dropdown', async () => {
    const wrapper = mountPage();
    await wrapper.find('input.base-checkbox').setValue(true);
    expect(mockState.checkChangeListener).toHaveBeenCalledWith(true);

    await wrapper.findAll('select.base-select')[0].setValue('BAY-A');
    expect(mockState.itemSelectedListener).toHaveBeenCalledWith('BAY-A');
  });

  it('4b. STK dropdown writes back to selectedStk (v-model)', async () => {
    const wrapper = mountPage();
    await wrapper.findAll('select.base-select')[1].setValue('STK-A');
    expect(mockState.selectedStk.value).toBe('STK-A');
  });

  it('5. modal: OK calls handleModalConfirm, 확인 calls handleModalCancel', async () => {
    mockState.messageModalOpen.value = true;
    mockState.messageModal.value = {
      title: 'Notification',
      message: 'Test modal body',
      isConfirm: true,
    };
    const wrapper = mountPage();

    expect(wrapper.find('.base-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('Test modal body');

    const footerBtns = wrapper.findAll('.message-modal__footer button');
    expect(footerBtns).toHaveLength(2);
    await footerBtns[0].trigger('click');
    expect(mockState.handleModalCancel).toHaveBeenCalled();
    await footerBtns[1].trigger('click');
    expect(mockState.handleModalConfirm).toHaveBeenCalled();
  });

  it('5b. modal without isConfirm renders only the OK button', () => {
    mockState.messageModalOpen.value = true;
    mockState.messageModal.value = { title: 'Info', message: 'Body', isConfirm: false };
    const wrapper = mountPage();
    expect(wrapper.findAll('.message-modal__footer button')).toHaveLength(1);
  });

  it('5c. modal update:open writes back to messageModalOpen (v-model:open)', async () => {
    mockState.messageModalOpen.value = true;
    mockState.messageModal.value = { title: 'Info', message: 'Body', isConfirm: false };
    const wrapper = mountPage();

    await wrapper.find('.modal-close').trigger('click');
    expect(mockState.messageModalOpen.value).toBe(false);
  });

  it('6. accessible name (aria-label) is attached to inputs', () => {
    const wrapper = mountPage();
    const inputs = wrapper.findAll('input.base-input');
    const labels = inputs.map((i) => i.attributes('aria-label'));

    expect(labels).toContain('진행 장비');
    expect(labels).toContain('RECIPE');
    expect(labels).toContain('PORT 1 LOT ID');
    expect(labels).toContain('PORT 2 LOT ID');
    expect(labels).toContain('PORT 1 제품명');
    expect(labels).toContain('PORT 2 제품명');
  });

  it('7. unmounting the page does not throw', () => {
    const wrapper = mountPage();
    expect(() => wrapper.unmount()).not.toThrow();
  });
});
