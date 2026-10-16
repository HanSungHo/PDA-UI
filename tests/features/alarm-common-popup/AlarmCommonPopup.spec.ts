import { mount } from '@vue/test-utils';
import AlarmCommonPopup from 'src/features/alarm-common-popup/components/AlarmCommonPopup.vue';
import {
  alarmCommonPopup,
  closeAlarmCommonPopup,
  showAlarmCommonPopup,
} from 'src/features/alarm-common-popup/services/alarm-common-popup.service';
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

describe('AlarmCommonPopup', () => {
  afterEach(() => {
    closeAlarmCommonPopup();
    alarmCommonPopup.rows.value = [];
    alarmCommonPopup.roomName.value = '';
    document.body.innerHTML = '';
  });

  it('shows the legacy room and parsed alarm rows with the legacy SpcResult highlight', async () => {
    showAlarmCommonPopup({
      level: 'HIGH',
      roomName: 'ETCH SAMPLE PQC',
      message: 'LotID=ABC123;SpcResult=FAIL',
    });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });

    await nextTick();

    expect(document.body.textContent).toContain('ETCH SAMPLE PQC');
    expect(document.body.textContent).toContain('LotID');
    expect(document.body.textContent).toContain('ABC123');
    expect(
      document.body.querySelector('.alarm-common-popup__value--spc-result')?.textContent,
    ).toContain('FAIL');

    wrapper.unmount();
  });

  it('closes only when OK is acknowledged', async () => {
    showAlarmCommonPopup({ level: 'HIGH', roomName: 'ETCH', message: 'LotID=ABC123' });
    const wrapper = mount(AlarmCommonPopup, { attachTo: document.body });

    await document.body.querySelector<HTMLButtonElement>('.alarm-common-popup__confirm')?.click();

    expect(alarmCommonPopup.open.value).toBe(false);
    wrapper.unmount();
  });
});
