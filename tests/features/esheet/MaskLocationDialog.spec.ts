// MaskLocationDialog.spec.ts

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MaskLocationDialog from '~/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import * as service from '~/features/esheet/services/mask-location-dialog.service';

vi.mock('~/features/esheet/services/mask-location-dialog.service', () => ({
  checkPhotoSample: vi.fn(),
}));

const mockResult = {
  align: 'ALIGN',
  etchRw: 'ETCH',
  grade: 'A',
  ret: 'PASS',
  stop: '',
};

function createWrapper(props = {}) {
  return mount(MaskLocationDialog, {
    props: {
      lotId: 'LOT001',
      currentLocation: 'LOC001',
      ...props,
    },
    global: {
      stubs: {
        BaseButton: {
          template: '<button><slot /></button>',
        },
        BaseInputField: {
          props: ['modelValue'],
          template: '<input />',
        },
        BaseTimePicker: {
          props: ['modelValue'],
          template: '<div>{{ modelValue }}</div>',
        },
      },
    },
  });
}

describe('MaskLocationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkSample', () => {
    it('should call service with equipmentId when entered', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper();

      wrapper.vm.updateEquipmentId('EQ001');

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).toHaveBeenCalledWith('EQ001');
    });

    it('should use currentLocation when equipmentId is empty', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper({
        currentLocation: 'LOCATION01',
      });

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).toHaveBeenCalledWith('LOCATION01');
    });

    it('should use subMachine when currentLocation contains 투광기', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper({
        currentLocation: '투광기-01',
        subMachine: 'SUB001',
      });

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).toHaveBeenCalledWith('SUB001');
    });

    it('should not call service when lotId is empty', async () => {
      const wrapper = createWrapper({
        lotId: '',
      });

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).not.toHaveBeenCalled();
    });

    it('should emit sampleCheck event', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper();

      await wrapper.vm.checkSample();

      expect(wrapper.emitted('sampleCheck')).toEqual([
        [
          {
            lotId: 'LOT001',
            location: 'LOC001',
            result: mockResult,
          },
        ],
      ]);
    });

    it('should update sample result after service success', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper();

      await wrapper.vm.checkSample();

      expect(wrapper.text()).toContain('PASS');
      expect(wrapper.text()).toContain('ALIGN');
      expect(wrapper.text()).toContain('ETCH');
      expect(wrapper.text()).toContain('A');
    });

    it('should show stop dialog when stop message exists', async () => {
      const stopResult = {
        align: '',
        etchRw: '',
        grade: '',
        ret: '',
        stop: 'STOP EQUIPMENT',
      };

      vi.mocked(service.checkPhotoSample).mockResolvedValue(stopResult);

      const wrapper = createWrapper();

      await wrapper.vm.checkSample();

      expect(wrapper.vm.showStopDialog).toBe(true);
      expect(wrapper.vm.stopMessage).toBe('STOP EQUIPMENT');
    });
  });

  describe('equipment normalization', () => {
    it('should convert input to uppercase', () => {
      const wrapper = createWrapper();

      wrapper.vm.updateEquipmentId('abc123');

      expect(wrapper.vm.equipmentId).toBe('ABC123');
    });

    it('should replace 02- with 01-', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper();

      wrapper.vm.updateEquipmentId('EQ02-123');

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).toHaveBeenCalledWith('EQ01-123');
    });

    it('should trim last 2 characters when there are two dashes', async () => {
      vi.mocked(service.checkPhotoSample).mockResolvedValue(mockResult);

      const wrapper = createWrapper();

      wrapper.vm.updateEquipmentId('AA-BB-CC');

      await wrapper.vm.checkSample();

      expect(service.checkPhotoSample).toHaveBeenCalledWith('AA-BB-');
    });
  });

  describe('stop dialog', () => {
    it('should close stop dialog', () => {
      const wrapper = createWrapper();

      wrapper.vm.showStopDialog = true;

      wrapper.vm.closeStopDialog();

      expect(wrapper.vm.showStopDialog).toBe(false);
    });
  });

  describe('events', () => {
    it('should emit ok event', async () => {
      const wrapper = createWrapper();

      await wrapper.vm.$emit('ok');

      expect(wrapper.emitted('ok')).toBeTruthy();
    });

    it('should emit close event', async () => {
      const wrapper = createWrapper();

      await wrapper.vm.$emit('close');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});
