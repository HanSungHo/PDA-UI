import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MoveInInline from '~/features/move-in/pages/MoveInInline.vue';
import { moveInInlineService } from '~/features/move-in/services/move-in-inline.service.ts';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { lotId: 'LOT001', operation: '1200' } }),
}));

vi.mock('~/features/main/stores/main.store', () => ({
  useMainStore: () => ({ facility: 'MAIN_FACILITY' }),
}));

vi.mock('~/features/move-in/services/move-in-inline.service.ts', () => ({
  moveInInlineService: {
    getInlineInfo: vi.fn(),
    getMaskLocationInfo: vi.fn(),
    inlineSet: vi.fn(),
  },
}));

vi.mock('~/components/base', async () => {
  const { defineComponent, h } = await import('vue');

  const BaseButton = defineComponent({
    name: 'BaseButton',

    props: {
      label: { type: String, default: '' },
      disabled: Boolean,
      variant: String,
    },

    emits: ['click'],

    setup(props, { emit }) {
      return () =>
        h(
          'button',
          {
            type: 'button',
            disabled: props.disabled,
            onClick: () => emit('click'),
          },
          props.label,
        );
    },
  });

  return { BaseButton };
});

vi.mock('~/components/base/input-field/BaseInputField.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseInputField',

      props: {
        modelValue: {
          type: [String, Number],
          default: '',
        },
        disabled: Boolean,
      },

      setup(props) {
        return () =>
          h('input', {
            value: props.modelValue,
            disabled: props.disabled,
          });
      },
    }),
  };
});

vi.mock('~/components/base/dropdown-list/BaseDropdownList.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseDropdownList',

      props: {
        modelValue: {
          type: String,
          default: '',
        },
        options: {
          type: Array,
          default: () => [],
        },
      },

      emits: ['update:modelValue'],

      setup(props, { emit }) {
        return () =>
          h(
            'select',
            {
              value: props.modelValue,
              onChange: (e: Event) =>
                emit('update:modelValue', (e.target as HTMLSelectElement).value),
            },
            (props.options as { label: string; value: string }[]).map((o) =>
              h('option', { value: o.value }, o.label),
            ),
          );
      },
    }),
  };
});

vi.mock('~/components/base/modal/BaseModal.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseModal',

      inheritAttrs: false,

      props: {
        open: Boolean,
        title: {
          type: String,
          default: '',
        },
      },

      setup(props, { slots }) {
        return () =>
          props.open
            ? h('div', { 'data-test': 'modal' }, [h('h3', props.title), slots.default?.()])
            : null;
      },
    }),
  };
});

vi.mock('~/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'MaskLocationDialog',

      props: [
        'maskTag',
        'productName',
        'giben',
        'status',
        'isUse',
        'currentLocation',
        'subMachine',
        'testHour',
        'lotId',
      ],

      emits: ['ok', 'close'],

      setup(props, { emit }) {
        return () =>
          h('div', { 'data-test': 'mask-dialog' }, [
            h('span', { 'data-test': 'mask-tag' }, props.maskTag),
            h('span', { 'data-test': 'mask-is-use' }, props.isUse),
            h(
              'button',
              {
                'data-test': 'mask-ok',
                onClick: () => emit('ok'),
              },
              'OK',
            ),
          ]);
      },
    }),
  };
});

vi.mock('~/features/machine-select-dialog/components/MachineSelectDialog.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'MachineSelectDialog',

      props: {
        params: {
          type: Object,
          required: true,
        },
      },

      emits: ['confirm', 'cancel'],

      setup(props, { emit }) {
        return () =>
          h(
            'div',
            {
              'data-test': 'machine-dialog',
              'data-facility': (props.params as { facility: string }).facility,
            },
            [
              h(
                'span',
                { 'data-test': 'machine-ident' },
                (props.params as { identCodeList: string }).identCodeList,
              ),

              h(
                'button',
                {
                  'data-test': 'machine-confirm',
                  onClick: () =>
                    emit('confirm', {
                      EQPGROUP: 'EG1',
                      EQPID: 'EQ1',
                      RECIPE: 'RCP1',
                    }),
                },
                'confirm',
              ),

              h(
                'button',
                {
                  'data-test': 'machine-cancel',
                  onClick: () => emit('cancel'),
                },
                'cancel',
              ),
            ],
          );
      },
    }),
  };
});

const service = vi.mocked(moveInInlineService);

const makeRows = (status: string[] = ['N', 'N', 'N']) =>
  [
    {
      processName: 'COAT',
      identCode: 'C',
      subOperation: '01',
    },
    {
      processName: 'EXPOSE',
      identCode: 'E',
      subOperation: '02',
    },
    {
      processName: 'DEVELOP',
      identCode: 'D',
      subOperation: '03',
    },
  ].map((row, index) => ({
    ...row,
    isComplete: status[index],
    localRecipe: `R${index + 1}`,
    workedEqp: '',
  }));

const makeInfoResponse = (
  options: {
    info?: Record<string, string>;
    rows?: ReturnType<typeof makeRows>;
  } = {},
) => ({
  isSuccessful: true,

  info: {
    product: 'PRODUCT-A',
    operation: '1200',
    photoJobCode: 'JOB-01',
    maskTag: 'MT001,MT002',
    changeMaskTag: '',
    inlineRecipe: 'RCP-01',
    processStep: 'PHOTO',
    quantity: '25',
    criticalStepper: 'S1',
    criticalStepper2: 'S2',
    criticalStepper3: 'S3',
    ...options.info,
  },

  rows: options.rows ?? makeRows(),
});

const maskResponse = {
  maskTag: 'MT001',
  product: 'PRODUCT-A',
  giben: 'G1',
  status: 'IDLE',
  isUse: 'Y',
  currentLoc: 'STK-01',
  subLocation3: 'A-01',
  afterInsp: 'Y',
};

const setResponse = {
  isSuccessful: true,
  isExposure: 'Y',
  eqpGroup: 'EG01',
  expEqpGroup: 'EXP01',
  subOperation: '02',
  commentQty: '1',
  nrwCommentQty: '2',
};

async function mountPage() {
  const wrapper = mount(MoveInInline);

  await flushPromises();

  return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>;

const findButton = (wrapper: Wrapper, label: string) =>
  wrapper.findAll('button').find((b) => b.text() === label)!;

const click = async (element: { trigger: (event: string) => Promise<void> }) => {
  await element.trigger('click');
  await flushPromises();
};

describe('MoveInInlinePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    service.getInlineInfo.mockResolvedValue(makeInfoResponse() as never);
  });

  describe('When entering the screen', () => {
    it('preserves the Android labels and casing', async () => {
      const wrapper = await mountPage();
      const text = wrapper.text();

      expect(text).toContain('INLINE 공정선택');
      expect(text).toContain('현재공정');
      expect(text).toContain('Inline Rcp');
      expect(text).toContain('실 MASKTAG');
      expect(text).toContain('Local Rcp');
      expect(text).toContain('Align St.');
      expect(text).toContain('Full IL');
      expect(text).not.toContain('진행 RCP');
      expect(text).not.toContain('Align Status');
      expect(text).not.toContain('FULL IL');
    });

    it('calls the API to retrieve information with lotId and operation from the route', async () => {
      await mountPage();

      expect(service.getInlineInfo).toHaveBeenCalledWith('LOT001', '1200');
    });

    it('displays the process rows', async () => {
      const wrapper = await mountPage();

      const rows = wrapper.findAll('tbody tr');

      expect(rows).toHaveLength(3);
      expect(rows[0]?.text()).toContain('COAT');
      expect(rows[1]?.text()).toContain('EXPOSE');
    });

    it('displays an error modal when the API returns an error', async () => {
      service.getInlineInfo.mockResolvedValue({
        isSuccessful: false,
        errorMessage: 'LOT không tồn tại',
      } as never);

      const wrapper = await mountPage();

      expect(wrapper.find('.message-modal__content').text()).toBe('LOT không tồn tại');
    });

    it('highlights the MASK TAG field in red when the mask tag has been changed', async () => {
      service.getInlineInfo.mockResolvedValue(
        makeInfoResponse({
          info: {
            maskTag: 'MT001',
            changeMaskTag: 'MT999',
          },
        }) as never,
      );

      const wrapper = await mountPage();

      expect(wrapper.find('.is-changed').exists()).toBe(true);
    });

    it('does not highlight the MASK TAG field when the mask tag has not changed', async () => {
      const wrapper = await mountPage();

      expect(wrapper.find('.is-changed').exists()).toBe(false);
    });

    it('disables the FULL IL button when there is already a completed row', async () => {
      service.getInlineInfo.mockResolvedValue(
        makeInfoResponse({
          rows: makeRows(['Y', 'N', 'N']),
        }) as never,
      );

      const wrapper = await mountPage();

      expect(findButton(wrapper, 'Full IL').attributes('disabled')).toBeDefined();
    });
  });

  describe('Process selection', () => {
    it('selects a row when clicked and deselects it when clicked again', async () => {
      const wrapper = await mountPage();

      await click(wrapper.findAll('tbody tr')[0]!);

      expect(wrapper.findAll('tbody tr')[0]?.classes()).toContain('row--selected');

      await click(wrapper.findAll('tbody tr')[0]!);

      expect(wrapper.findAll('tbody tr')[0]?.classes()).not.toContain('row--selected');
    });

    it('displays a completed row with the row--complete class', async () => {
      service.getInlineInfo.mockResolvedValue(
        makeInfoResponse({
          rows: makeRows(['Y', 'N', 'N']),
        }) as never,
      );

      const wrapper = await mountPage();

      expect(wrapper.findAll('tbody tr')[0]?.classes()).toContain('row--complete');
    });

    it('selects all rows when FULL IL is clicked', async () => {
      const wrapper = await mountPage();

      await click(findButton(wrapper, 'Full IL'));

      const rows = wrapper.findAll('tbody tr');

      expect(rows.every((r) => r.classes().includes('row--selected'))).toBe(true);
    });
  });

  describe('Error modal', () => {
    it('displays a validation error when 확인 is clicked without selecting a process', async () => {
      const wrapper = await mountPage();

      await click(findButton(wrapper, '확인'));

      expect(wrapper.find('[data-test="modal"] h3').text()).toBe('에  러');
      expect(wrapper.find('.message-modal__content').text()).toBe('진행 할 공정을 선택하세요');

      expect(service.inlineSet).not.toHaveBeenCalled();
    });

    it('closes the modal and displays the same error again when 확인 is clicked a second time', async () => {
      const wrapper = await mountPage();

      await click(findButton(wrapper, '확인'));

      await click(wrapper.find('.message-modal button'));

      expect(wrapper.find('.message-modal').exists()).toBe(false);

      await click(findButton(wrapper, '확인'));

      expect(wrapper.find('.message-modal__content').text()).toBe('진행 할 공정을 선택하세요');
    });

    it('requires a NEST selection after selecting process steps', async () => {
      const wrapper = await mountPage();

      await click(findButton(wrapper, 'Full IL'));
      await click(findButton(wrapper, '확인'));

      expect(wrapper.find('[data-test="modal"] h3').text()).toBe('에  러');
      expect(wrapper.find('.message-modal__content').text()).toBe('진행할 NEST를 선택하세요.');
      expect(service.inlineSet).not.toHaveBeenCalled();
    });
  });

  describe('MaskLocationDialog', () => {
    it('opens the dialog with mask data when "실 MASKTAG" is clicked successfully', async () => {
      service.getMaskLocationInfo.mockResolvedValue(maskResponse as never);

      const wrapper = await mountPage();

      await click(findButton(wrapper, '실 MASKTAG'));

      expect(service.getMaskLocationInfo).toHaveBeenCalledWith('MT001');

      expect(wrapper.find('[data-test="mask-dialog"]').exists()).toBe(true);

      expect(wrapper.find('[data-test="mask-tag"]').text()).toBe('MT001');

      expect(wrapper.find('[data-test="mask-is-use"]').text()).toBe('사용가능');
    });

    it('closes the dialog when OK is clicked', async () => {
      service.getMaskLocationInfo.mockResolvedValue(maskResponse as never);

      const wrapper = await mountPage();

      await click(findButton(wrapper, '실 MASKTAG'));

      await click(wrapper.find('[data-test="mask-ok"]'));

      expect(wrapper.find('[data-test="mask-dialog"]').exists()).toBe(false);
    });

    it('does not open the dialog and displays an error when the server returns no data', async () => {
      service.getMaskLocationInfo.mockResolvedValue(null as never);

      const wrapper = await mountPage();

      await click(findButton(wrapper, '실 MASKTAG'));

      expect(wrapper.find('[data-test="mask-dialog"]').exists()).toBe(false);

      expect(wrapper.find('.message-modal__content').text()).toBe(
        'Mask Location 정보를 찾을 수 없습니다.',
      );
    });
  });

  describe('MachineSelectDialog', () => {
    async function openMachineDialog() {
      service.inlineSet.mockResolvedValue(setResponse as never);

      const wrapper = await mountPage();
      await wrapper.find('select').setValue('1');

      await click(findButton(wrapper, 'Full IL'));

      await click(findButton(wrapper, '확인'));

      return wrapper;
    }

    it('opens the machine selection dialog after 확인 succeeds', async () => {
      const wrapper = await openMachineDialog();

      expect(wrapper.find('[data-test="machine-dialog"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="machine-dialog"]').attributes('data-facility')).toBe(
        'MAIN_FACILITY',
      );

      expect(wrapper.find('[data-test="machine-ident"]').text()).toBe('CED');
    });

    it('does not open the dialog and displays an error when the server rejects the request', async () => {
      service.inlineSet.mockResolvedValue({
        isSuccessful: false,
        errorMessage: 'NEST không hợp lệ',
      } as never);

      const wrapper = await mountPage();
      await wrapper.find('select').setValue('1');

      await click(findButton(wrapper, 'Full IL'));

      await click(findButton(wrapper, '확인'));

      expect(wrapper.find('[data-test="machine-dialog"]').exists()).toBe(false);

      expect(wrapper.find('.message-modal__content').text()).toBe('NEST không hợp lệ');
    });

    it('closes the dialog when Cancel is clicked and remains on the current screen', async () => {
      const wrapper = await openMachineDialog();

      await click(wrapper.find('[data-test="machine-cancel"]'));

      expect(wrapper.find('[data-test="machine-dialog"]').exists()).toBe(false);
      expect(wrapper.emitted('inline-cancel')).toBeUndefined();
      expect(wrapper.emitted('inline-complete')).toBeUndefined();
    });

    it('emits the selected machine result to Move In when confirmed', async () => {
      const wrapper = await openMachineDialog();

      await click(wrapper.find('[data-test="machine-confirm"]'));

      expect(wrapper.emitted('inline-complete')?.[0]).toEqual([
        {
          eqpGroup: 'EG1',
          eqpId: 'EQ1',
          recipe: 'RCP1',
          commentQty: '1',
          nrwCmtCount: '2',
          nest: '1',
          identCode: 'CED',
          maskTag: 'MT001,MT002',
        },
      ]);
    });
    it('emits a cancel event when the header back button is clicked', async () => {
      const wrapper = await mountPage();

      await click(wrapper.find('.back-btn'));

      expect(wrapper.emitted('inline-cancel')).toHaveLength(1);
    });
  });

  describe('Navigation back', () => {
    it('emits a cancel event when 취소 is clicked without saving a result', async () => {
      const wrapper = await mountPage();

      await click(findButton(wrapper, '취소'));

      expect(wrapper.emitted('inline-cancel')).toHaveLength(1);
      expect(wrapper.emitted('inline-complete')).toBeUndefined();
    });
  });
});
