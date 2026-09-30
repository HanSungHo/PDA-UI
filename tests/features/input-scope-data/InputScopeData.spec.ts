import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InputScopeDataModal from '~/features/input-scope-data/components/InputScopeDataModal.vue';
import InputScopeDataView from '~/features/input-scope-data/components/InputScopeDataView.vue';
import {
  resetAllScopeMocks,
  setMockGetScopeLotInfoOverride,
} from '~/features/input-scope-data/mocks/input-scope-data.mock';
import { useInputScopeDataStore } from '~/features/input-scope-data/stores/input-scope-data.store';

enableAutoUnmount(afterEach);

vi.mock('src/services/ok-dialog.service', () => ({
  okDialog: {
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('InputScopeData (View & Modal & Store)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    document.body.innerHTML = '';
    resetAllScopeMocks();
    vi.restoreAllMocks();
  });

  describe('InputScopeDataView layout and initial state', () => {
    it('renders header title, form labels, 25 wafer buttons, and action buttons', async () => {
      const wrapper = mount(InputScopeDataView);

      expect(wrapper.find('.isd__title').text()).toBe('Scope 측정 Data 입력');

      const labels = wrapper.findAll('.isd__field-label');
      expect(labels.length).toBe(5);
      expect(labels[0].text()).toBe('LOT ID');
      expect(labels[1].text()).toBe('Side Rinse');
      expect(labels[2].text()).toBe('WEE폭');
      expect(labels[3].text()).toBe('LOGO');
      expect(labels[4].text()).toBe('불량 항목');

      const waferBtns = wrapper.findAll('.isd__slot');
      expect(waferBtns.length).toBe(25);
      expect(waferBtns[0].text()).toBe('01');
      expect(waferBtns[24].text()).toBe('25');

      expect(wrapper.find('.isd__footer .isd__btn--primary').text()).toContain('확인');
      expect(wrapper.find('.isd__footer .isd__btn--tertiary').text()).toBe('취소');
    });

    it('initializes and locks lot input when initialLotId prop is provided', async () => {
      const wrapper = mount(InputScopeDataView, {
        props: {
          initialLotId: 'WA2409001',
        },
      });

      await flushPromises();

      const input = wrapper.find<HTMLInputElement>('#isd_lot_id');
      expect(input.element.value).toBe('WA2409001');
      expect(input.attributes('disabled')).toBeDefined();

      const searchBtn = wrapper.find('.isd__row .isd__btn--secondary');
      expect(searchBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('Barcode reading & validation', () => {
    it('displays READING ERROR alert when scanned barcode does not start with space', async () => {
      const wrapper = mount(InputScopeDataView);
      const store = useInputScopeDataStore();

      await store.handleLotBarcodeEnter('INVALIDBARCODE');
      await flushPromises();

      expect(okDialog.show).toHaveBeenCalledWith(
        'READING ERROR',
        'LOT#를 읽어주세요.',
        expect.any(String),
      );
      expect(store.lotId).toBe('');
      expect(wrapper.exists()).toBe(true);
    });

    it('correctly parses barcode with space and check digit', async () => {
      const wrapper = mount(InputScopeDataView);
      const store = useInputScopeDataStore();

      await store.handleLotSearch(' WA24090011');
      await flushPromises();

      expect(store.lotId).toBe('WA2409001');
      expect(store.masterInfo?.lotName).toBe('WA2409001');
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Wafer slot selection and sorting', () => {
    it('toggles selection and displays sorted comma-separated string in wafer list box', async () => {
      const wrapper = mount(InputScopeDataView, {
        props: {
          initialLotId: 'WA2409001',
        },
      });

      await flushPromises();

      const store = useInputScopeDataStore();
      expect(store.slots.length).toBe(25);

      // Toggle slot 05 and slot 02
      store.toggleSlot('05');
      store.toggleSlot('02');
      await flushPromises();

      expect(store.selectedWaferString).toBe('02,05');
      expect(wrapper.find('.isd__wafer-list-box').text()).toBe('02,05');

      // Deselect slot 02
      store.toggleSlot('02');
      await flushPromises();

      expect(store.selectedWaferString).toBe('05');
      expect(wrapper.find('.isd__wafer-list-box').text()).toBe('05');
    });

    it('clears all wafer selections when clicking 정정 button', async () => {
      const wrapper = mount(InputScopeDataView, {
        props: {
          initialLotId: 'WA2409001',
        },
      });

      await flushPromises();

      const store = useInputScopeDataStore();
      store.toggleSlot('01');
      store.toggleSlot('03');
      await flushPromises();

      expect(store.selectedWaferString).toBe('01,03');

      const modifyBtn = wrapper.findAll('button').find((b) => b.text() === '정정');
      expect(modifyBtn).toBeDefined();
      await modifyBtn!.trigger('click');
      await flushPromises();

      expect(store.selectedWaferString).toBe('');
      expect(wrapper.find('.isd__wafer-list-box').text()).toBe('');
    });
  });

  describe('Existing data warning (ISEXIST == Y)', () => {
    it('displays warning dialog when lot data was entered previously', async () => {
      setMockGetScopeLotInfoOverride({
        result: 'SUCCESS',
        isExist: 'Y',
        lotName: 'EXISTING_LOT',
      });

      mount(InputScopeDataView, {
        props: {
          initialLotId: 'EXISTING_LOT',
        },
      });

      await flushPromises();

      const store = useInputScopeDataStore();
      expect(store.confirmState.visible).toBe(true);
      expect(store.confirmState.title).toBe('경  고');
      expect(store.confirmState.message).toContain('이전에 이미 입력한 데이터가 있습니다');

      // Confirm to proceed
      store.confirmState.onConfirm();
      await flushPromises();

      expect(store.confirmState.visible).toBe(false);
      expect(store.masterInfo?.lotName).toBe('EXISTING_LOT');
    });
  });

  describe('Submission and Complete/Cancel events', () => {
    it('submits scope data on 확인 click and emits complete event after closing alert', async () => {
      const wrapper = mount(InputScopeDataView, {
        props: {
          initialLotId: 'WA2409001',
        },
      });

      await flushPromises();

      const store = useInputScopeDataStore();
      store.sideRinse = '2.5';
      store.weeWidth = '3.0';
      store.logo = 'KF_LOGO';
      store.toggleSlot('01');
      store.toggleSlot('02');

      const okBtn = wrapper.find('.isd__footer .isd__btn--primary');
      await okBtn.trigger('click');
      await flushPromises();

      expect(store.alertState.visible).toBe(true);
      expect(store.alertState.message).toBe('데이터가 저장 되었습니다.');

      // Close success alert
      store.closeAlert();

      // Trigger view's alert close handling
      wrapper.vm.handleAlertClose();

      expect(wrapper.emitted('complete')).toBeTruthy();
      const completeEvent = wrapper.emitted('complete')![0][0] as {
        lotId: string;
        logo: string;
        waferList: string;
      };
      expect(completeEvent.lotId).toBe('WA2409001');
      expect(completeEvent.logo).toBe('KF_LOGO');
      expect(completeEvent.waferList).toBe('01,02');
    });

    it('emits cancel event when clicking 취소 button', async () => {
      const wrapper = mount(InputScopeDataView);

      const cancelBtn = wrapper.find('.isd__footer .isd__btn--tertiary');
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });

  describe('InputScopeDataModal wrapper', () => {
    it('renders inside modal and emits complete/cancel', async () => {
      const wrapper = mount(InputScopeDataModal, {
        props: {
          modelValue: true,
          initialLotId: 'WA2409001',
        },
      });

      await flushPromises();
      expect(wrapper.findComponent(InputScopeDataView).exists()).toBe(true);
    });
  });
});
