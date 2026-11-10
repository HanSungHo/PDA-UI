import { flushPromises, mount } from '@vue/test-utils';
import { BaseModal } from 'src/components/base';
import AlarmCommonPopup from 'src/features/alarm-common-popup/components/AlarmCommonPopup.vue';
import {
  alarmCommonPopup,
  closeAlarmCommonPopup,
  showAlarmCommonPopup,
} from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const { addListener } = vi.hoisted(() => ({ addListener: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: { addListener } }));

const okButton = () => document.body.querySelector<HTMLButtonElement>('.ds-modal__footer button');

describe('AlarmCommonPopup', () => {
  let remove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    remove = vi.fn().mockResolvedValue(undefined);
    addListener.mockReset();
    addListener.mockResolvedValue({ remove });
  });

  afterEach(() => {
    closeAlarmCommonPopup();
    alarmCommonPopup.rows.value = [];
    alarmCommonPopup.roomName.value = '';
    document.body.innerHTML = '';
  });

  it('shows the legacy room title, parsed rows and the SpcResult highlight', async () => {
    showAlarmCommonPopup({
      level: 'HIGH',
      roomName: 'ETCH SAMPLE PQC',
      message: 'LotID=ABC123;SpcResult=FAIL;spcresult=ok',
    });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await nextTick();

    expect(document.body.querySelector('.ds-modal__title')?.textContent).toContain(
      'ETCH SAMPLE PQC',
    );
    const rows = document.body.querySelectorAll('.alarm-common-popup__row');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('LotID');
    expect(rows[0]?.textContent).toContain('ABC123');
    const highlighted = document.body.querySelectorAll('.alarm-common-popup__value--spc-result');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.textContent).toContain('FAIL');
    expect(okButton()?.textContent?.trim()).toBe('OK');

    wrapper.unmount();
  });

  it('lists every pair, including identical duplicates, like the legacy RecyclerView', async () => {
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'A=1;A=1;A=1' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await nextTick();

    expect(document.body.querySelectorAll('.alarm-common-popup__row')).toHaveLength(3);
    wrapper.unmount();
  });

  it('closes on OK (finish)', async () => {
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await nextTick();

    okButton()?.click();

    expect(alarmCommonPopup.open.value).toBe(false);
    wrapper.unmount();
  });

  it('treats the device Back button as finish and removes the listener afterwards', async () => {
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await flushPromises();

    expect(addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
    const handler = addListener.mock.calls[0]?.[1] as () => void;
    handler();
    expect(alarmCommonPopup.open.value).toBe(false);

    await flushPromises();
    expect(remove).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('closes when the dialog reports a Back/Escape dismissal, but not on an outside click', async () => {
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await nextTick();

    document.body.querySelector<HTMLElement>('.q-dialog__backdrop')?.click();
    await nextTick();
    expect(alarmCommonPopup.open.value).toBe(true);

    wrapper.findComponent(BaseModal).vm.$emit('update:open', false);
    await nextTick();
    expect(alarmCommonPopup.open.value).toBe(false);
    wrapper.unmount();
  });

  it('removes a listener that resolves after the popup was already closed', async () => {
    let resolveListener: (value: { remove: typeof remove }) => void = () => undefined;
    addListener.mockReturnValueOnce(new Promise((resolve) => (resolveListener = resolve)));
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await nextTick();

    closeAlarmCommonPopup();
    await nextTick();
    resolveListener({ remove });
    await flushPromises();

    expect(remove).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores a failing Capacitor App listener registration', async () => {
    addListener.mockRejectedValue(new Error('no app plugin'));
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });
    await flushPromises();

    expect(alarmCommonPopup.open.value).toBe(true);
    wrapper.unmount();
  });
});
