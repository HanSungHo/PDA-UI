import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

/* ------------------------------ Base component stubs ------------------------------ */

vi.mock('src/components/base', async () => {
  const { defineComponent, h } = await import('vue');

  const BaseScreen = defineComponent({
    name: 'BaseScreen',
    props: { title: { type: String, default: '' } },
    setup(props, { slots }) {
      return () =>
        h('div', { 'data-testid': 'screen', 'data-title': props.title }, [
          h('div', { class: 'screen-body' }, slots.default?.()),
          h('div', { class: 'screen-footer' }, slots.footer?.()),
        ]);
    },
  });

  const BaseInput = defineComponent({
    name: 'BaseInput',
    props: {
      label: { type: String, default: '' },
      modelValue: { type: [String, Number], default: '' },
      readonly: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          'data-label': props.label,
          value: props.modelValue,
          readonly: props.readonly,
          onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
        });
    },
  });

  const BaseButton = defineComponent({
    name: 'BaseButton',
    props: {
      label: { type: String, default: '' },
      disabled: { type: Boolean, default: false },
      loading: { type: Boolean, default: false },
      variant: { type: String, default: '' },
      size: { type: String, default: '' },
    },
    setup(props) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            'data-label': props.label,
            'data-variant': props.variant,
            'data-loading': String(props.loading),
            disabled: props.disabled,
          },
          props.label,
        );
    },
  });

  const BaseCheckbox = defineComponent({
    name: 'BaseCheckbox',
    props: {
      label: { type: String, default: '' },
      modelValue: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      return () =>
        h('input', {
          type: 'checkbox',
          'data-label': props.label,
          checked: props.modelValue,
          disabled: props.disabled,
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).checked),
        });
    },
  });

  const BaseModal = defineComponent({
    name: 'BaseModal',
    props: {
      open: { type: Boolean, default: false },
      title: { type: String, default: '' },
    },
    emits: ['update:open', 'cancel'],
    setup(props, { emit, slots }) {
      return () =>
        props.open
          ? h('div', { 'data-testid': 'modal', 'data-title': props.title }, [
              h('div', { class: 'modal-body' }, slots.default?.()),
              h('div', { class: 'modal-footer' }, slots.footer?.()),
              h('span', { 'data-testid': 'modal-cancel', onClick: () => emit('cancel') }),
            ])
          : null;
    },
  });

  return { BaseScreen, BaseInput, BaseButton, BaseCheckbox, BaseModal };
});

vi.mock('~/components/base/revo-grid/BaseRevoGrid.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'BaseRevoGrid',
      props: {
        rows: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
      },
      emits: ['row-select'],
      setup(props, { emit }) {
        return () =>
          h(
            'div',
            {
              'data-testid': 'grid',
              'data-columns': (props.columns as { name: string }[]).map((c) => c.name).join('|'),
            },
            (props.rows as { id: string; rowClass: string }[]).map((row) =>
              h('button', {
                class: 'grid-row',
                'data-row-id': row.id,
                'data-row-class': row.rowClass,
                onClick: () => emit('row-select', row.id),
              }),
            ),
          );
      },
    }),
  };
});

/* ------------------------------ Composable mocks ------------------------------ */

vi.mock('../../../../src/features/move-in/composables/useConfirmModal', async () => {
  const { ref } = await import('vue');
  const state = {
    modalOpen: ref(false),
    modalTitle: ref(''),
    modalMessage: ref(''),
    modalType: ref<'alert' | 'confirm'>('alert'),
    resolveModal: vi.fn(),
    handleModalCancel: vi.fn(),
  };
  return { useConfirmModal: () => state };
});

vi.mock('../../../../src/features/move-in/composables/useProcessInquire', async () => {
  const { reactive, ref } = await import('vue');
  const state = {
    options: undefined as { onComplete: (r: unknown) => void } | undefined,
    form: reactive<Record<string, unknown>>({}),
    rows: ref<{ id: string; status: string; subOperation: string; description: string }[]>([]),
    skipCurrentProcess: ref(false),
    scopeSubstitution: ref(false),
    isCurrentOperationSkipEnabled: ref(true),
    isLoading: ref(false),
    isSubmitting: ref(false),
    toggleMeasureRow: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    submitCurrentMeasure: vi.fn(),
    getWaferSelectPayload: vi.fn(),
  };
  return {
    useProcessInquire: (options: { onComplete: (r: unknown) => void }) => {
      state.options = options;
      return state;
    },
  };
});

import { useConfirmModal } from '../../../../src/features/move-in/composables/useConfirmModal';
import { useProcessInquire } from '../../../../src/features/move-in/composables/useProcessInquire';
import ProcessInquire from '../../../../src/features/move-in/pages/ProcessInquire.vue';

/* --------------------------------- Helpers --------------------------------- */

// The mocks return one shared state object, so these are the same refs the page uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inquire = useProcessInquire({ onComplete: () => undefined }) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const confirm = useConfirmModal() as any;

function resetState(): void {
  Object.keys(inquire.form).forEach((key) => delete inquire.form[key]);
  Object.assign(inquire.form, {
    lotNo: 'LOT-DEMO-01',
    job: 'PHOTO-DEMO-01',
    currentProcess: 'Null',
    productName: 'HIFI-UI-DEMO',
    quantity: 25,
    currentSlot: '01,02,03,04',
    currentWf: '01,02,03,04',
    semSlot: '01,02,03,04',
    semWf: '01,02,03,04',
  });
  inquire.rows.value = [
    { id: 'r1', status: 'C', subOperation: 'CD', description: 'Critical Dimension Check' },
    { id: 'r2', status: 'N', subOperation: 'OVER', description: 'Critical Alignment Check' },
    { id: 'r3', status: 'Y', subOperation: 'ETCH', description: 'Etch Check' },
  ];
  inquire.skipCurrentProcess.value = false;
  inquire.scopeSubstitution.value = false;
  inquire.isCurrentOperationSkipEnabled.value = true;
  inquire.isLoading.value = false;
  inquire.isSubmitting.value = false;
  inquire.toggleMeasureRow.mockClear();
  inquire.initialize.mockClear();
  inquire.submitCurrentMeasure.mockClear();
  inquire.getWaferSelectPayload.mockReset();
  inquire.getWaferSelectPayload.mockImplementation((target: string) =>
    target.endsWith('Slot')
      ? { target, lotId: 'LOT-1', existingWaferList: 'Slot.1,Slot.2,Slot.3', fixedCount: 2 }
      : { target, lotId: 'LOT-1', existingWaferList: 'LOT-1.01,LOT-1.02,LOT-1.03', fixedCount: 2 },
  );

  confirm.modalOpen.value = false;
  confirm.modalTitle.value = '';
  confirm.modalMessage.value = '';
  confirm.modalType.value = 'alert';
  confirm.resolveModal.mockClear();
  confirm.handleModalCancel.mockClear();
}

function mountPage() {
  return mount(ProcessInquire);
}

type Wrapper = ReturnType<typeof mountPage>;

const WH_INDEX = { currentSlot: 0, currentWf: 1, semSlot: 2, semWf: 3 } as const;

async function openWafer(wrapper: Wrapper, target: keyof typeof WH_INDEX) {
  await wrapper.findAll('button[data-label="W/H"]')[WH_INDEX[target]].trigger('click');
  await nextTick();
}

function footerButton(wrapper: Wrapper, label: string) {
  return wrapper.find(`.screen-footer button[data-label="${label}"]`);
}

function modalByTitle(wrapper: Wrapper, title: string) {
  return wrapper.find(`[data-testid="modal"][data-title="${title}"]`);
}

/* ----------------------------------- Tests ----------------------------------- */

describe('ProcessInquire.vue', () => {
  beforeEach(() => {
    resetState();
  });

  describe('rendering', () => {
    it('renders the screen title', () => {
      const wrapper = mountPage();
      expect(wrapper.get('[data-testid="screen"]').attributes('data-title')).toBe('계측 공정선택');
    });

    it('renders the read-only fields with form values', () => {
      const wrapper = mountPage();
      const lot = wrapper.get<HTMLInputElement>('input[data-label="LOT No."]');
      expect(lot.element.value).toBe('LOT-DEMO-01');
      expect(lot.attributes('readonly')).toBeDefined();
      expect(wrapper.get<HTMLInputElement>('input[data-label="JOB"]').element.value).toBe(
        'PHOTO-DEMO-01',
      );
      expect(wrapper.get<HTMLInputElement>('input[data-label="현재공정"]').element.value).toBe(
        'Null',
      );
      expect(wrapper.get<HTMLInputElement>('input[data-label="제품명"]').element.value).toBe(
        'HIFI-UI-DEMO',
      );
      expect(wrapper.get<HTMLInputElement>('input[data-label="수량"]').element.value).toBe('25');
    });

    it('renders an empty quantity when quantity is nullish', () => {
      inquire.form.quantity = undefined;
      const wrapper = mountPage();
      expect(wrapper.get<HTMLInputElement>('input[data-label="수량"]').element.value).toBe('');
    });

    it('uses the same labels as the design (two "WF" fields, no "SEM WF")', () => {
      const wrapper = mountPage();
      expect(wrapper.findAll('input[data-label="WF"]')).toHaveLength(2);
      expect(wrapper.find('input[data-label="SEM WF"]').exists()).toBe(false);
      expect(wrapper.find('input[data-label="현상SLOT"]').exists()).toBe(true);
      expect(wrapper.find('input[data-label="SEM SLOT"]').exists()).toBe(true);
      expect(wrapper.findAll('button[data-label="W/H"]')).toHaveLength(4);
    });

    it('updates the form when editable inputs change', async () => {
      const wrapper = mountPage();
      await wrapper.get('input[data-label="현상SLOT"]').setValue('05');
      await wrapper.get('input[data-label="SEM SLOT"]').setValue('06');
      const wfInputs = wrapper.findAll('input[data-label="WF"]');
      await wfInputs[0].setValue('07');
      await wfInputs[1].setValue('08');
      expect(inquire.form.currentSlot).toBe('05');
      expect(inquire.form.semSlot).toBe('06');
      expect(inquire.form.currentWf).toBe('07');
      expect(inquire.form.semWf).toBe('08');
    });

    it('calls initialize on mount', () => {
      mountPage();
      expect(inquire.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('grid', () => {
    it('passes the "Process" / "S" / "Description" column headers', () => {
      const wrapper = mountPage();
      expect(wrapper.get('[data-testid="grid"]').attributes('data-columns')).toBe(
        'Process|S|Description',
      );
    });

    it('maps row status to row classes', () => {
      const wrapper = mountPage();
      const rows = wrapper.findAll('.grid-row');
      expect(rows[0].attributes('data-row-class')).toBe('process-inquire__row--complete');
      expect(rows[1].attributes('data-row-class')).toBe('');
      expect(rows[2].attributes('data-row-class')).toBe('process-inquire__row--selected');
    });

    it('toggles the measure row when a known row is selected', async () => {
      const wrapper = mountPage();
      await wrapper.findAll('.grid-row')[1].trigger('click');
      expect(inquire.toggleMeasureRow).toHaveBeenCalledTimes(1);
      expect(inquire.toggleMeasureRow).toHaveBeenCalledWith(inquire.rows.value[1]);
    });

    it('ignores selection of an unknown row key', async () => {
      const wrapper = mountPage();
      wrapper.getComponent({ name: 'BaseRevoGrid' }).vm.$emit('row-select', 'does-not-exist');
      await nextTick();
      expect(inquire.toggleMeasureRow).not.toHaveBeenCalled();
    });
  });

  describe('checkboxes', () => {
    it('renders both checkboxes in order: 현공정 Skip, Scope 대체', () => {
      const wrapper = mountPage();
      const boxes = wrapper.findAll('input[type="checkbox"]');
      expect(boxes.map((b) => b.attributes('data-label'))).toEqual(['현공정 Skip', 'Scope 대체']);
    });

    it('enables 현공정 Skip when the current operation allows it', () => {
      const wrapper = mountPage();
      expect(wrapper.get('input[data-label="현공정 Skip"]').attributes('disabled')).toBeUndefined();
    });

    it('disables 현공정 Skip when the current operation does not allow it', () => {
      inquire.isCurrentOperationSkipEnabled.value = false;
      const wrapper = mountPage();
      expect(wrapper.get('input[data-label="현공정 Skip"]').attributes('disabled')).toBeDefined();
    });

    it('keeps Scope 대체 always enabled', () => {
      inquire.isCurrentOperationSkipEnabled.value = false;
      const wrapper = mountPage();
      expect(wrapper.get('input[data-label="Scope 대체"]').attributes('disabled')).toBeUndefined();
    });

    it('updates skipCurrentProcess and scopeSubstitution via v-model', async () => {
      const wrapper = mountPage();
      await wrapper.get('input[data-label="현공정 Skip"]').setValue(true);
      await wrapper.get('input[data-label="Scope 대체"]').setValue(true);
      expect(inquire.skipCurrentProcess.value).toBe(true);
      expect(inquire.scopeSubstitution.value).toBe(true);
    });
  });

  describe('footer', () => {
    it('submits the current measure on 확인', async () => {
      const wrapper = mountPage();
      await footerButton(wrapper, '확인').trigger('click');
      expect(inquire.submitCurrentMeasure).toHaveBeenCalledTimes(1);
    });

    it('disables 확인 while loading and shows the submitting state', () => {
      inquire.isLoading.value = true;
      inquire.isSubmitting.value = true;
      const wrapper = mountPage();
      const ok = footerButton(wrapper, '확인');
      expect(ok.attributes('disabled')).toBeDefined();
      expect(ok.attributes('data-loading')).toBe('true');
    });

    it('emits cancel on 취소', async () => {
      const wrapper = mountPage();
      await footerButton(wrapper, '취소').trigger('click');
      expect(wrapper.emitted('cancel')).toHaveLength(1);
    });

    it('emits complete when the composable reports completion', () => {
      const wrapper = mountPage();
      const result = { ok: true };
      inquire.options.onComplete(result);
      expect(wrapper.emitted('complete')?.[0]).toEqual([result]);
    });
  });

  describe('wafer select modal', () => {
    it('is closed by default', () => {
      const wrapper = mountPage();
      expect(modalByTitle(wrapper, 'WAFER 선택').exists()).toBe(false);
    });

    it.each([['currentSlot'], ['currentWf'], ['semSlot'], ['semWf']] as const)(
      'opens for target %s',
      async (target) => {
        const wrapper = mountPage();
        await openWafer(wrapper, target);
        expect(inquire.getWaferSelectPayload).toHaveBeenCalledWith(target);
        expect(modalByTitle(wrapper, 'WAFER 선택').exists()).toBe(true);
      },
    );

    it('shows the LOT number and option labels without the prefix', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      const modal = modalByTitle(wrapper, 'WAFER 선택');
      expect(modal.text()).toContain('LOT-DEMO-01');
      expect(modal.findAll('.wafer-option').map((o) => o.text())).toEqual(['01', '02', '03']);
    });

    it('renders no options when the payload has an empty wafer list', async () => {
      inquire.getWaferSelectPayload.mockReturnValue({
        target: 'currentWf',
        lotId: 'LOT-1',
        existingWaferList: '',
        fixedCount: 2,
      });
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      expect(wrapper.findAll('.wafer-option')).toHaveLength(0);
    });

    it('selects and deselects an option', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      const options = wrapper.findAll('.wafer-option');

      await options[0].trigger('click');
      expect(options[0].classes()).toContain('is-selected');
      expect(options[0].attributes('aria-pressed')).toBe('true');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('LOT-1.01');

      await options[0].trigger('click');
      expect(options[0].classes()).not.toContain('is-selected');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('');
    });

    it('does not select more options than fixedCount', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      const options = wrapper.findAll('.wafer-option');
      await options[0].trigger('click');
      await options[1].trigger('click');
      await options[2].trigger('click');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('LOT-1.01, LOT-1.02');
      expect(options[2].classes()).not.toContain('is-selected');
    });

    it('전체선택 selects up to fixedCount when options exceed the limit', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      await modalByTitle(wrapper, 'WAFER 선택')
        .get('button[data-label="전체선택"]')
        .trigger('click');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('LOT-1.01, LOT-1.02');
    });

    it('전체선택 clears the selection when every option is already selected', async () => {
      inquire.getWaferSelectPayload.mockReturnValue({
        target: 'currentWf',
        lotId: 'LOT-1',
        existingWaferList: 'LOT-1.01,LOT-1.02',
        fixedCount: 2,
      });
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      const selectAll = modalByTitle(wrapper, 'WAFER 선택').get('button[data-label="전체선택"]');

      await selectAll.trigger('click');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('LOT-1.01, LOT-1.02');

      await selectAll.trigger('click');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('');
    });

    it('writes the selection (without LOT prefix) to the form on 확인', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      const options = wrapper.findAll('.wafer-option');
      await options[0].trigger('click');
      await options[2].trigger('click');
      // third click is ignored by the limit (fixedCount = 2), so only 01 and 03 are selected

      await modalByTitle(wrapper, 'WAFER 선택').get('button[data-label="확인"]').trigger('click');

      expect(inquire.form.currentWf).toBe('01,03');
      expect(modalByTitle(wrapper, 'WAFER 선택').exists()).toBe(false);
    });

    it('strips the "Slot." prefix for slot targets', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'semSlot');
      const options = wrapper.findAll('.wafer-option');
      await options[0].trigger('click');
      await options[1].trigger('click');

      await modalByTitle(wrapper, 'WAFER 선택').get('button[data-label="확인"]').trigger('click');

      expect(inquire.form.semSlot).toBe('1,2');
    });

    it('clears the target field and closes on 취소', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentSlot');

      await modalByTitle(wrapper, 'WAFER 선택').get('button[data-label="취소"]').trigger('click');

      expect(inquire.form.currentSlot).toBe('');
      expect(modalByTitle(wrapper, 'WAFER 선택').exists()).toBe(false);
    });

    it('clears the target field and closes when the modal emits cancel', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'semWf');

      await modalByTitle(wrapper, 'WAFER 선택')
        .get('[data-testid="modal-cancel"]')
        .trigger('click');

      expect(inquire.form.semWf).toBe('');
      expect(modalByTitle(wrapper, 'WAFER 선택').exists()).toBe(false);
    });

    it('resets the previous selection when reopened', async () => {
      const wrapper = mountPage();
      await openWafer(wrapper, 'currentWf');
      await wrapper.findAll('.wafer-option')[0].trigger('click');
      await modalByTitle(wrapper, 'WAFER 선택').get('button[data-label="취소"]').trigger('click');

      await openWafer(wrapper, 'currentWf');
      expect(wrapper.get('.selected-wafer-list').text()).toBe('');
    });
  });

  describe('common alert / confirm modal', () => {
    it('is hidden when modalOpen is false', () => {
      const wrapper = mountPage();
      expect(wrapper.find('.process-inquire-modal-message').exists()).toBe(false);
    });

    it('shows title and message for an alert, with only the 확인 button', () => {
      confirm.modalOpen.value = true;
      confirm.modalTitle.value = '알림';
      confirm.modalMessage.value = '처리되었습니다.';
      confirm.modalType.value = 'alert';
      const wrapper = mountPage();

      const modal = modalByTitle(wrapper, '알림');
      expect(modal.exists()).toBe(true);
      expect(modal.get('.process-inquire-modal-message').text()).toBe('처리되었습니다.');
      expect(modal.find('button[data-label="취소"]').exists()).toBe(false);
      expect(modal.find('button[data-label="확인"]').exists()).toBe(true);
    });

    it('shows both 취소 and 확인 for a confirm', () => {
      confirm.modalOpen.value = true;
      confirm.modalTitle.value = '확인';
      confirm.modalMessage.value = '진행하시겠습니까?';
      confirm.modalType.value = 'confirm';
      const wrapper = mountPage();

      const modal = modalByTitle(wrapper, '확인');
      expect(modal.find('button[data-label="취소"]').exists()).toBe(true);
      expect(modal.find('button[data-label="확인"]').exists()).toBe(true);
    });

    it('resolves true on 확인', async () => {
      confirm.modalOpen.value = true;
      confirm.modalTitle.value = '확인';
      confirm.modalType.value = 'confirm';
      const wrapper = mountPage();

      await modalByTitle(wrapper, '확인').get('button[data-label="확인"]').trigger('click');
      expect(confirm.resolveModal).toHaveBeenCalledWith(true);
    });

    it('resolves false on 취소', async () => {
      confirm.modalOpen.value = true;
      confirm.modalTitle.value = '확인';
      confirm.modalType.value = 'confirm';
      const wrapper = mountPage();

      await modalByTitle(wrapper, '확인').get('button[data-label="취소"]').trigger('click');
      expect(confirm.resolveModal).toHaveBeenCalledWith(false);
    });

    it('delegates modal cancel to handleModalCancel', async () => {
      confirm.modalOpen.value = true;
      confirm.modalTitle.value = '알림';
      const wrapper = mountPage();

      await modalByTitle(wrapper, '알림').get('[data-testid="modal-cancel"]').trigger('click');
      expect(confirm.handleModalCancel).toHaveBeenCalledTimes(1);
    });
  });
});
