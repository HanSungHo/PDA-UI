import { flushPromises, mount } from '@vue/test-utils';
import MDSSpcOverlay from 'src/features/mds-spc/components/MDSSpcOverlay.vue';
import { emptyMDSSpcFields } from 'src/features/mds-spc/mds-spc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

const serviceMock = vi.hoisted(() => ({
  CheckData: vi.fn(),
  InsertData: vi.fn(),
  releaseMDSSpcEvent: vi.fn(),
  setData: vi.fn(),
}));
const appMock = vi.hoisted(() => ({ addListener: vi.fn(), remove: vi.fn(async () => undefined) }));

vi.mock('src/features/mds-spc/mds-spc.service', () => ({
  ...serviceMock,
  optionsForSpinner: (values: string[]) => values.map((label, value) => ({ label, value })),
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: appMock.addListener } }));

const ScreenStub = defineComponent({
  name: 'MDSSpcScreen',
  props: {
    fields: { type: Object, required: true },
    title: { type: String, required: true },
    measureOptions: { type: Array, required: true },
    actionOptions: { type: Array, required: true },
    selectedMeasure: { type: [String, Number, Array] },
    selectedAction: { type: [String, Number, Array] },
    isBusy: { type: Boolean, required: true },
  },
  emits: ['ok', 'save', 'update:selectedMeasure', 'update:selectedAction'],
  setup(_props, { emit }) {
    return () =>
      h('div', [
        h('button', {
          'data-testid': 'measure-second',
          onClick: () => emit('update:selectedMeasure', 1),
        }),
        h('button', {
          'data-testid': 'action-second',
          onClick: () => emit('update:selectedAction', 1),
        }),
        h('button', { 'data-testid': 'save', onClick: () => emit('save') }, '저장'),
        h('button', { 'data-testid': 'ok', onClick: () => emit('ok') }, 'OK'),
      ]);
  },
});

const ToastStub = defineComponent({
  name: 'BaseToast',
  inheritAttrs: false,
  props: {
    type: { type: String, default: 'info' },
    description: { type: String, default: '' },
    title: { type: String, default: '' },
    closable: { type: Boolean, default: false },
    duration: { type: Number, default: 0 },
  },
  setup(props) {
    return () => h('output', { 'data-testid': 'toast' }, props.description);
  },
});

const event = {
  id: 'mds-1',
  fields: emptyMDSSpcFields(),
  title: '#MDSSPC INTERLOCK#',
  shouldCheckData: true,
};

// Controls are queried through the rendered screen component.
function control(wrapper: ReturnType<typeof mountOverlay>, testId: string) {
  return wrapper.findComponent(ScreenStub).get(`[data-testid="${testId}"]`);
}

function mountOverlay(currentEvent = event) {
  return mount(MDSSpcOverlay, {
    attachTo: document.body,
    props: { event: currentEvent },
    global: { stubs: { MDSSpcScreen: ScreenStub, BaseToast: ToastStub } },
  });
}

describe('MDSSPC overlay interactions', () => {
  beforeEach(() => {
    serviceMock.CheckData.mockResolvedValue({
      measure: ['NULL', 'Inspection'],
      action: ['NULL', 'Action'],
    });
    serviceMock.InsertData.mockResolvedValue(undefined);
    serviceMock.setData.mockResolvedValue(undefined);
    appMock.addListener.mockResolvedValue({ remove: appMock.remove });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('loads choices only for an Android interlock payload and selects the first option', async () => {
    const wrapper = mountOverlay();
    await flushPromises();

    const screen = wrapper.findComponent(ScreenStub);
    expect(serviceMock.CheckData).toHaveBeenCalledWith(event.fields);
    expect(screen.props('selectedMeasure')).toBe(0);
    expect(screen.props('selectedAction')).toBe(0);
    expect(screen.props('title')).toBe('#MDSSPC INTERLOCK#');
    wrapper.unmount();
  });

  it('does not request choices when the legacy message has no INTERLOCKMANAGER', async () => {
    const wrapper = mountOverlay({ ...event, title: 'PR EMPTY INTERLOCK', shouldCheckData: false });
    await flushPromises();

    expect(serviceMock.CheckData).not.toHaveBeenCalled();
    expect(wrapper.findComponent(ScreenStub).props('title')).toBe('PR EMPTY INTERLOCK');
    wrapper.unmount();
  });

  it('shows the legacy already-entered toast when both spinners contain one item', async () => {
    serviceMock.CheckData.mockResolvedValueOnce({ measure: ['Inspect'], action: ['Adjust'] });
    const wrapper = mountOverlay();
    await flushPromises();
    await control(wrapper, 'save').trigger('click');

    expect(wrapper.findComponent(ToastStub).text()).toBe('이미 입력된 Data 입니다.');
    expect(serviceMock.InsertData).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows the legacy missing-selection toast without sending MDSINSERT', async () => {
    serviceMock.CheckData.mockResolvedValueOnce({ measure: [], action: ['NULL', 'Action'] });
    const wrapper = mountOverlay();
    await flushPromises();
    await control(wrapper, 'save').trigger('click');

    expect(wrapper.findComponent(ToastStub).text()).toBe('항목을 모두 선택해주세요.');
    expect(serviceMock.InsertData).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('sends the selected Android option labels and keeps the screen open after save', async () => {
    const wrapper = mountOverlay();
    await flushPromises();
    await control(wrapper, 'measure-second').trigger('click');
    await control(wrapper, 'action-second').trigger('click');
    await control(wrapper, 'save').trigger('click');
    await flushPromises();

    expect(serviceMock.InsertData).toHaveBeenCalledWith({
      measure: 'Inspection',
      action: 'Action',
      fields: event.fields,
    });
    expect(wrapper.findComponent(ScreenStub).exists()).toBe(true);
    wrapper.unmount();
  });

  it('blocks Save while choices load and ignores duplicate Save while an insert is pending', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    let resolveChoices: ((value: { measure: string[]; action: string[] }) => void) | undefined;
    serviceMock.CheckData.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveChoices = resolve;
        }),
    );
    let resolveInsert: (() => void) | undefined;
    serviceMock.InsertData.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveInsert = resolve;
        }),
    );

    const wrapper = mountOverlay();
    const screen = wrapper.findComponent(ScreenStub);
    await nextTick();
    expect(screen.props('isBusy')).toBe(true);

    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).not.toHaveBeenCalled();

    resolveChoices?.({ measure: ['NULL', 'Inspection'], action: ['NULL', 'Action'] });
    await flushPromises();
    expect(screen.props('isBusy')).toBe(false);

    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).toHaveBeenCalledOnce();
    expect(screen.props('isBusy')).toBe(true);

    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).toHaveBeenCalledOnce();

    resolveInsert?.();
    await flushPromises();
    expect(screen.props('isBusy')).toBe(false);

    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).toHaveBeenCalledOnce();
    nowSpy.mockReturnValue(11_000);
    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).toHaveBeenCalledOnce();
    nowSpy.mockReturnValue(11_001);
    await control(wrapper, 'save').trigger('click');
    expect(serviceMock.InsertData).toHaveBeenCalledTimes(2);
    await flushPromises();
    nowSpy.mockRestore();
    wrapper.unmount();
  });

  it('acknowledges on OK and dismisses without acknowledgement on Android Back', async () => {
    const wrapper = mountOverlay();
    await flushPromises();
    await control(wrapper, 'ok').trigger('click');
    expect(serviceMock.setData).toHaveBeenCalledWith(event.fields);
    expect(serviceMock.releaseMDSSpcEvent).toHaveBeenCalledWith(event.id);
    wrapper.unmount();

    serviceMock.setData.mockClear();
    serviceMock.releaseMDSSpcEvent.mockClear();
    const secondEvent = { ...event, id: 'mds-2' };
    const secondWrapper = mountOverlay(secondEvent);
    await flushPromises();
    // The second overlay registers its own Capacitor backButton listener.
    const backButton = appMock.addListener.mock.calls.at(-1)?.[1] as () => void;
    backButton();

    expect(serviceMock.setData).not.toHaveBeenCalled();
    expect(serviceMock.releaseMDSSpcEvent).toHaveBeenCalledWith(secondEvent.id);
    secondWrapper.unmount();
  });
});
