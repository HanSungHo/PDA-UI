import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ESheetEdcPage from 'src/features/esheet/pages/ESheetEdcPage.vue';
import { getEdcData } from 'src/features/esheet/services/esheet-edc.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter, type LocationQueryRaw } from 'vue-router';

vi.mock('src/features/esheet/services/esheet-edc.service', () => ({
  getEdcData: vi.fn(),
}));

const BaseButtonStub = defineComponent({
  name: 'BaseButton',
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
});

const BaseInputStub = defineComponent({
  name: 'BaseInput',
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    readonly: Boolean,
  },
  template: '<label>{{ label }}<input :value="modelValue" :readonly="readonly" /></label>',
});

const BaseScreenStub = defineComponent({
  name: 'BaseScreen',
  props: { title: { type: String, default: '' } },
  template:
    '<section><header><h1>{{ title }}</h1></header><div><slot /></div><footer><slot name="footer" /></footer></section>',
});

const BaseCheckboxStub = defineComponent({
  name: 'BaseCheckbox',
  props: {
    modelValue: Boolean,
    label: { type: String, default: '' },
    disabled: Boolean,
  },
  emits: ['update:modelValue'],
  template:
    '<label><input type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />{{ label }}</label>',
});

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    open: Boolean,
    title: { type: String, default: '' },
  },
  template:
    '<div v-if="open" role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></div>',
});

const BaseRevoGridStub = defineComponent({
  name: 'BaseRevoGrid',
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    resize: { type: Boolean, default: true },
    filter: { type: Boolean, default: true },
  },
  template:
    '<div data-testid="esheet-edc-grid"><span v-for="column in columns" :key="column.prop">{{ column.name }}</span><span v-for="row in rows" :key="row.__rowId">{{ row.SLOTID }}</span></div>',
});

const getEdcDataMock = vi.mocked(getEdcData);

function successResponse(processType = 'THICK', items = [{ SLOTID: '01' }]) {
  return {
    statusCode: 200,
    result: JSON.stringify({
      STATUS: 'PASS',
      MSGBODY: { PROCESSTYPE: processType, ITEMS: { ITEM: items } },
    }),
  };
}

function failureResponse() {
  return {
    statusCode: 200,
    result: JSON.stringify({
      STATUS: 'FAIL',
      ERRMSG: 'EDC DATA 조회에 실패하였습니다.',
      MSGBODY: '',
    }),
  };
}

async function mountPage(
  query: LocationQueryRaw = {
    LOTID: 'LOT-DEMO-01',
    OPERATION: '1000',
    SUBOPERATION: '00',
    PROCESSSTEP: 'PHOTO',
    REALRECIPE: 'RCP-THK-01',
  },
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/esheet', component: { template: '<div>Parent</div>' } },
      { path: '/esheet/edc', component: ESheetEdcPage },
    ],
  });
  await router.push('/esheet');
  await router.push({ path: '/esheet/edc', query });
  await router.isReady();

  const wrapper = mount(ESheetEdcPage, {
    global: {
      plugins: [createPinia(), router],
      stubs: {
        BaseButton: BaseButtonStub,
        BaseCheckbox: BaseCheckboxStub,
        BaseInput: BaseInputStub,
        BaseModal: BaseModalStub,
        BaseRevoGrid: BaseRevoGridStub,
        BaseScreen: BaseScreenStub,
      },
    },
  });

  await flushPromises();
  return { router, wrapper };
}

describe('ESheetEdcPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads legacy Intent data and refetches when full view is enabled', async () => {
    getEdcDataMock.mockResolvedValue(successResponse() as never);
    const { wrapper } = await mountPage();

    expect(getEdcDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lotId: 'LOT-DEMO-01',
        operation: '1000',
        subOperation: '00',
        processStep: 'PHOTO',
        recipe: 'RCP-THK-01',
      }),
    );
    expect(wrapper.getComponent(BaseRevoGridStub).props('columns')).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'QUL', size: 0 })]),
    );
    expect(wrapper.getComponent(BaseRevoGridStub).props()).toMatchObject({
      filter: false,
      resize: false,
    });

    await wrapper.get('input[type="checkbox"]').setValue(true);
    await flushPromises();

    expect(getEdcDataMock).toHaveBeenCalledTimes(2);
    expect(wrapper.getComponent(BaseRevoGridStub).props('columns')).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'QUL', size: 120 })]),
    );
  });

  it('uses empty request values when query keys are missing or repeated', async () => {
    getEdcDataMock.mockResolvedValue(successResponse() as never);
    await mountPage({ LOTID: ['LOT-A', 'LOT-B'] });

    expect(getEdcDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lotId: '',
        operation: '',
        subOperation: '',
        processStep: '',
        recipe: '',
      }),
    );
  });

  it('shows business errors and dismisses them with the OK action', async () => {
    getEdcDataMock.mockResolvedValue(failureResponse() as never);
    const { wrapper } = await mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('EDC DATA 조회에 실패하였습니다.');
    await wrapper.get('[role="dialog"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('shows the legacy error when a successful response has an empty message body', async () => {
    getEdcDataMock.mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: '' }),
    } as never);
    const { wrapper } = await mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('BODY가 존재하지 않습니다');
  });

  it.each([
    ['missing', {}],
    ['null', { MSGBODY: null }],
    ['a string', { MSGBODY: 'not an object' }],
    ['an array', { MSGBODY: [] }],
  ])('shows the legacy error when a successful response has %s MSGBODY', async (_, body) => {
    getEdcDataMock.mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', ...body }),
    } as never);
    const { wrapper } = await mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('BODY가 존재하지 않습니다');
    expect(wrapper.find('[data-testid="esheet-edc-grid"]').exists()).toBe(false);
  });

  it('uses an empty message when a failure envelope omits ERRMSG', async () => {
    getEdcDataMock.mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', MSGBODY: '' }),
    } as never);
    const { wrapper } = await mountPage();

    expect(wrapper.get('.esheet-edc__error-message').text()).toBe('');
  });

  it('shows transport errors in the same acknowledgement dialog', async () => {
    getEdcDataMock.mockRejectedValue(new Error('Network unavailable'));
    const { wrapper } = await mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('Network unavailable');
  });

  it('converts non-Error transport failures to visible text', async () => {
    getEdcDataMock.mockRejectedValue('Transport unavailable');
    const { wrapper } = await mountPage();

    expect(wrapper.get('[role="dialog"]').text()).toContain('Transport unavailable');
  });

  it('renders no grid for unsupported process types and for empty row lists', async () => {
    getEdcDataMock.mockResolvedValue(successResponse('WT') as never);
    const unsupported = await mountPage();
    expect(unsupported.wrapper.find('[data-testid="esheet-edc-grid"]').exists()).toBe(false);
    expect(unsupported.wrapper.find('.esheet-edc__empty-state').exists()).toBe(false);
    expect(unsupported.wrapper.text()).not.toContain('해당 결과가 없습니다');

    getEdcDataMock.mockResolvedValue(successResponse('THICK', []) as never);
    const empty = await mountPage();
    expect(empty.wrapper.find('[data-testid="esheet-edc-grid"]').exists()).toBe(true);
    expect(empty.wrapper.get('[data-testid="esheet-edc-grid"]').text()).toContain('RANGE');
  });

  it('shows grid columns when the response omits the item list', async () => {
    getEdcDataMock.mockResolvedValue(successResponse('THICK', undefined) as never);
    const { wrapper } = await mountPage();

    expect(wrapper.get('[data-testid="esheet-edc-grid"]').text()).toContain('RANGE');
    expect(wrapper.get('[data-testid="esheet-edc-grid"]').text()).not.toContain('undefined');
  });

  it('closes to the parent screen without returning a result', async () => {
    getEdcDataMock.mockResolvedValue(successResponse() as never);
    const { router, wrapper } = await mountPage();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/esheet');
  });
});
