import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Ref, ref } from 'vue';

const { handlers, mockUseEtchInspection } = vi.hoisted(() => ({
  handlers: {
    updateLotInput: vi.fn(),
    searchData: vi.fn(),
    handleLotEnter: vi.fn(),
    execution: vi.fn(),
    confirmExecution: vi.fn(),
    close: vi.fn(),
    closeDialog: vi.fn(),
    cancelDialog: vi.fn(),
    setLotInputRef: vi.fn(),
  },
  mockUseEtchInspection: vi.fn(),
}));

vi.mock('src/features/etch-inspection/composables/use-etch-inspection', () => ({
  useEtchInspection: mockUseEtchInspection,
}));

import EtchInspectionPage from 'src/features/etch-inspection/pages/EtchInspectionPage.vue';

const InputStub = {
  props: ['modelValue', 'label', 'disabled', 'readonly'],
  emits: ['update:modelValue'],
  template:
    '<label>{{ label }}<input :value="modelValue" :disabled="disabled" :readonly="readonly" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
};
const ButtonStub = {
  props: ['disabled', 'loading', 'ariaLabel'],
  emits: ['click'],
  template:
    '<button :aria-label="ariaLabel" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const ModalStub = {
  props: ['open', 'title'],
  emits: ['update:open'],
  template: '<section v-if="open"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
};

describe('EtchInspectionPage', () => {
  let LOTID: Ref<string>;
  let txtInspectionComment: Ref<string>;
  let dialogTitle: Ref<string>;
  let dialogMessage: Ref<string>;
  let dialogMode: Ref<'alert' | 'confirm' | ''>;

  beforeEach(() => {
    vi.clearAllMocks();
    LOTID = ref('');
    txtInspectionComment = ref('');
    dialogTitle = ref('');
    dialogMessage = ref('');
    dialogMode = ref('');
    mockUseEtchInspection.mockReturnValue({
      LOTID,
      txtViewLotname: ref(''),
      OldOperation: ref(''),
      OldOperationDesc: ref(''),
      oldMachine: ref(''),
      NowOperation: ref(''),
      NowOperationDesc: ref(''),
      sInspDate: ref(''),
      sproduct: ref(''),
      txtInspectionComment,
      loading: ref(false),
      canExecute: ref(true),
      dialogTitle,
      dialogMessage,
      dialogMode,
      ...handlers,
    });
  });

  function createPage() {
    return mount(EtchInspectionPage, {
      global: {
        stubs: {
          BaseInput: InputStub,
          BaseButton: ButtonStub,
          BaseModal: ModalStub,
        },
      },
    });
  }

  it('renders the 360x720 mobile shell and all Figma business labels', () => {
    const wrapper = createPage();

    expect(wrapper.find('.etch-inspection-main').exists()).toBe(true);
    expect(wrapper.text()).toContain('ETCH INSPECTION');
    expect(wrapper.text()).toContain('LOT Name');
    expect(wrapper.text()).toContain('조회');
    expect(wrapper.text()).toContain('ETCH SCOPE 검사 정보');
    expect(wrapper.text()).toContain('제품명');
    expect(wrapper.text()).toContain('이전 공정 정보');
    expect(wrapper.text()).toContain('현재 공정 정보');
    expect(wrapper.text()).toContain('MOVE IN 장비');
    expect(wrapper.text()).toContain('완성 검사 입력 정보');
    expect(wrapper.text()).toContain('검사 일시');
    expect(wrapper.text()).toContain('COMMENT');
    expect(wrapper.text()).toContain('실행');
    expect(wrapper.text()).toContain('닫기');
    expect(wrapper.text()).not.toContain('Null');
  });

  it('forwards search, Enter, execute, and close events to the composable', async () => {
    const wrapper = createPage();
    const lotInput = wrapper.findAll('input')[0];

    await lotInput.setValue('lot-1');
    await lotInput.trigger('keyup.enter');
    await wrapper.findAll('button')[1].trigger('click');
    await wrapper.findAll('button')[2].trigger('click');
    await wrapper.findAll('button')[3].trigger('click');

    expect(handlers.updateLotInput).toHaveBeenCalledWith('lot-1');
    expect(handlers.handleLotEnter).toHaveBeenCalledOnce();
    expect(handlers.searchData).toHaveBeenCalledOnce();
    expect(handlers.execution).toHaveBeenCalledOnce();
    expect(handlers.close).toHaveBeenCalledOnce();
  });

  it('updates COMMENT and renders legacy confirm choices', async () => {
    dialogMode.value = 'confirm';
    dialogTitle.value = '알  림';
    dialogMessage.value = '[ETCH-010] 공정의 검사 이력이 있습니다.';
    const wrapper = createPage();
    const inputs = wrapper.findAll('input');

    await inputs[inputs.length - 1].setValue('inspection comment');
    expect(txtInspectionComment.value).toBe('inspection comment');
    expect(wrapper.text()).toContain('아니오');
    expect(wrapper.text()).toContain('예');

    const buttons = wrapper.findAll('button');
    await buttons[buttons.length - 2].trigger('click');
    await buttons[buttons.length - 1].trigger('click');
    expect(handlers.cancelDialog).toHaveBeenCalledOnce();
    expect(handlers.confirmExecution).toHaveBeenCalledOnce();
  });

  it('renders alert dialog confirmation and closes it', async () => {
    dialogMode.value = 'alert';
    dialogTitle.value = '에  러';
    dialogMessage.value = 'LOT ID을 입력하세요';
    const wrapper = createPage();

    expect(wrapper.text()).toContain('에  러');
    expect(wrapper.text()).toContain('LOT ID을 입력하세요');
    await wrapper.findAll('button')[wrapper.findAll('button').length - 1].trigger('click');
    expect(handlers.closeDialog).toHaveBeenCalledOnce();
  });
});
