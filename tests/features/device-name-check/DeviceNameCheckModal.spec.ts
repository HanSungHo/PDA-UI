import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DeviceNameCheckModal from 'src/features/device-name-check/components/DeviceNameCheckModal.vue';
import { useDeviceNameCheckStore } from 'src/features/device-name-check/stores/device-name-check.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DeviceNameCheckModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  function createWrapper(props = {}) {
    return mount(DeviceNameCheckModal, {
      props: {
        open: true,
        initialIp: '192.168.0.50',
        initialDeviceName: 'AR001',
        ...props,
      },
      global: {
        stubs: {
          BaseModal: {
            props: ['open', 'width', 'closable', 'overlayClosable', 'title'],
            emits: ['update:open'],
            template: `
              <div v-if="open" class="base-modal-stub">
                <button class="modal-stub-close" @click="$emit('update:open', false)">Close</button>
                <div class="header-slot"><slot name="title">{{ title }}</slot></div>
                <div class="body-slot"><slot /></div>
                <div class="footer-slot"><slot name="footer" /></div>
              </div>
            `,
          },
          BaseButton: {
            props: ['loading'],
            template:
              '<button class="base-button-stub" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
          },
          OkDialog: {
            props: ['open', 'title', 'message', 'confirmLabel'],
            emits: ['confirm', 'update:open'],
            template: `
              <div v-if="open" class="ok-dialog-stub">
                <span class="ok-dialog-title">{{ title }}</span>
                <span class="ok-dialog-msg">{{ message }}</span>
                <button class="ok-dialog-confirm" @click="$emit('confirm')">{{ confirmLabel }}</button>
                <button class="ok-dialog-close" @click="$emit('update:open', false)">Close Dialog</button>
              </div>
            `,
          },
        },
      },
    });
  }

  it('renders modal content with exact legacy labels', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('PDA 기기명 확인');
    expect(wrapper.text()).toContain('PDA 기기명이 잘못 설정 되었습니다.');
    expect(wrapper.text()).toContain('반장님께 PDA 기기명 변경을 요청 하시기 바랍니다.');
    expect(wrapper.text()).toContain('현재 PDA IP');
    expect(wrapper.text()).toContain('현재 기기명');
    expect(wrapper.text()).toContain('새로운 기기명');
    expect(wrapper.text()).toContain('AR');
    expect(wrapper.text()).toContain('확인');
  });

  it('displays provided initialIp and initialDeviceName', async () => {
    const wrapper = createWrapper({
      initialIp: '172.16.0.99',
      initialDeviceName: 'AR888',
    });
    await flushPromises();

    const ipInput = wrapper.find<HTMLInputElement>('#pda-ip');
    const deviceNameInput = wrapper.find<HTMLInputElement>('#pda-current-name');

    expect(ipInput.element.value).toBe('172.16.0.99');
    expect(deviceNameInput.element.value).toBe('AR888');
  });

  it('updates store input value on typing', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const input = wrapper.find<HTMLInputElement>('#pda-new-name');
    await input.setValue('123');

    const store = useDeviceNameCheckStore();
    expect(store.newPdaDigits).toBe('123');
  });

  it('triggers validation alert when clicking OK with empty input', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const store = useDeviceNameCheckStore();
    const btn = wrapper.find('.device-name-check-modal__btn-ok');
    await btn.trigger('click');
    await flushPromises();

    expect(store.alertState.isOpen).toBe(true);
    expect(store.alertState.message).toBe('새로운 PDA 명이 비어있습니다.');
    expect(wrapper.find('.ok-dialog-stub').exists()).toBe(true);
  });

  it('triggers validation alert on Enter key with invalid length', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const store = useDeviceNameCheckStore();
    store.setNewPdaDigits('12');

    const input = wrapper.find<HTMLInputElement>('#pda-new-name');
    await input.trigger('keydown.enter');
    await flushPromises();

    expect(store.alertState.isOpen).toBe(true);
    expect(store.alertState.message).toBe('3자리 숫자를 입력해주세요.');
  });

  it('submits successfully and emits confirm with new name when valid digits entered', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const store = useDeviceNameCheckStore();
    store.setNewPdaDigits('009');

    const btn = wrapper.find('.device-name-check-modal__btn-ok');
    await btn.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('confirm')![0]).toEqual(['AR009']);
    expect(wrapper.emitted('update:open')).toBeTruthy();
    expect(wrapper.emitted('update:open')![0]).toEqual([false]);
  });

  it('dismisses error alert when OkDialog confirms', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const store = useDeviceNameCheckStore();
    store.showAlert('Error', 'Test Error');
    await flushPromises();

    expect(wrapper.find('.ok-dialog-stub').exists()).toBe(true);
    await wrapper.find('.ok-dialog-confirm').trigger('click');
    await flushPromises();

    expect(store.alertState.isOpen).toBe(false);
  });

  it('dismisses error alert when OkDialog emits update:open false', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const store = useDeviceNameCheckStore();
    store.showAlert('Error', 'Test Error');
    await flushPromises();

    expect(wrapper.find('.ok-dialog-stub').exists()).toBe(true);
    await wrapper.find('.ok-dialog-close').trigger('click');
    await flushPromises();

    expect(store.alertState.isOpen).toBe(false);
  });

  it('handles update:open emission correctly', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.find('.modal-stub-close').trigger('click');
    expect(wrapper.emitted('update:open')).toBeTruthy();
  });
});
