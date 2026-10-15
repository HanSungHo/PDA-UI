import type { VueWrapper } from '@vue/test-utils';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RemoteEtchCommRcpModal from '~/features/remote-start/pages/RemoteEtchCommRcpModal.vue';
import { remoteEtchService } from '~/features/remote-start/services/remoteEtchCommRcp.service';
import type { RemoteEtchInboundParams } from '~/features/remote-start/types/remoteEtchCommRcp.types';

type MountProps = {
  modelValue: boolean;
  inboundParams?: RemoteEtchInboundParams;
};
interface ComponentVm {
  isExecuting: boolean;
  handleClose: () => void;
  handleModalOpenChange: (val: boolean) => void;
  dialogState: { open: boolean };
  confirmState: { open: boolean; onConfirm?: () => void | Promise<void> };
  closeAlert: () => void;
}

describe('RemoteEtchCommRcpModal.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    vi.spyOn(remoteEtchService, 'getEtchCommRcp').mockResolvedValue({
      isSuccessFul: true,
      result: {
        DOWNLOAD: 'Y',
        PROCESS_TYPE: 'TE8500',
        EQP_TYPE: 'TE8500',
        OWNERCODE: 'OWNER_TEST',
        COMM2ND: '60 초',
        COMMRCP: [{ COL: '진행 TIME', VALUE: '60', RESULT: '' }],
      },
    });
  });

  const globalStubs = {
    BaseModal: {
      name: 'BaseModal',
      emits: ['update:open', 'cancel'],
      template:
        '<div v-if="open" class="base-modal-stub"><slot name="title"/><slot /><slot name="footer"/></div>',
      props: ['open'],
    },
    BaseInput: {
      name: 'BaseInput',
      template: '<input class="base-input-stub" :value="modelValue" :disabled="readonly" />',
      props: ['modelValue', 'readonly', 'label'],
    },
    BaseButton: {
      name: 'BaseButton',
      emits: ['click'],
      template:
        '<button class="base-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
      props: ['label', 'disabled', 'loading'],
    },
    BaseRevoGrid: {
      name: 'BaseRevoGrid',
      template: '<div class="base-revogrid-stub"></div>',
      props: ['columns', 'rows'],
    },
  };

  // Provide a Pinia instance for every mount so stores can be used inside the component.
  const buildGlobal = () => ({
    stubs: globalStubs,
    plugins: [createPinia()],
  });

  const mountModal = async (props: MountProps = { modelValue: true }) => {
    const wrapper = mount(RemoteEtchCommRcpModal, {
      props,
      global: buildGlobal(),
    });
    await flushPromises();
    return wrapper;
  };

  const getModals = (wrapper: VueWrapper<unknown>) =>
    wrapper.findAllComponents({ name: 'BaseModal' });

  it('covers default inboundParams factory and renders initial data', async () => {
    const wrapper = await mountModal();

    expect(wrapper.find('.rcp-modal__title').text()).toContain('RCP 조건 ( OWNER_TEST )');
    const buttons = wrapper.findAll('.base-button-stub');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts custom inboundParams', async () => {
    const wrapper = await mountModal({
      modelValue: true,
      inboundParams: {
        LOTID: 'LOT_X',
        RECIPE: 'RCP_X',
        EQPID: 'EQP_X',
        OPERID: 'OPER_X',
        OPERDESC: 'Desc X',
      },
    });

    expect(wrapper.find('.rcp-modal__title').exists()).toBe(true);
  });

  it('triggers executeModify when clicking the modify button', async () => {
    const wrapper = await mountModal();

    const modifyBtn = wrapper.find('.rcp-field-row .base-button-stub');
    expect(modifyBtn.exists()).toBe(true);
    await modifyBtn.trigger('click');

    const vm = wrapper.vm as unknown as ComponentVm;
    expect(vm.confirmState.open).toBe(true);
  });

  it('handleClose: blocks when executing, allows when idle (close button)', async () => {
    const wrapper = await mountModal();
    const vm = wrapper.vm as unknown as ComponentVm;

    // Branch 1: isExecuting = true -> block
    vm.isExecuting = true;
    vm.handleClose();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();

    // Branch 2: isExecuting = false -> allowed
    vm.isExecuting = false;
    await wrapper.vm.$nextTick();
    await wrapper.find('.rcp-btn--close').trigger('click');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('handles @cancel event of the main modal via handleClose', async () => {
    const wrapper = await mountModal();

    getModals(wrapper)[0].vm.$emit('cancel');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('handleModalOpenChange: emits close only when value is false', async () => {
    const wrapper = await mountModal();
    const mainModal = getModals(wrapper)[0];

    // val = true ->  emit update:modelValue
    mainModal.vm.$emit('update:open', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    expect(wrapper.emitted('close')).toBeFalsy();

    // val = false -> emit update:modelValue + close
    mainModal.vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([false]);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('covers watch on modelValue for both true and false changes', async () => {
    const getSpy = vi.spyOn(remoteEtchService, 'getEtchCommRcp');

    const wrapper = mount(RemoteEtchCommRcpModal, {
      props: { modelValue: false },
      global: buildGlobal(),
    });
    expect(getSpy).not.toHaveBeenCalled();

    await wrapper.setProps({ modelValue: true });
    expect(getSpy).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ modelValue: false });
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('calls setData on mounted when modelValue is true', async () => {
    const getSpy = vi.spyOn(remoteEtchService, 'getEtchCommRcp');
    await mountModal({ modelValue: true });
    expect(getSpy).toHaveBeenCalled();
  });

  it('OkDialog: closeAlert via @update:open and via confirm button', async () => {
    const wrapper = await mountModal();
    const vm = wrapper.vm as unknown as ComponentVm;

    // 1. Via OkDialog's @update:open
    vm.dialogState.open = true;
    await wrapper.vm.$nextTick();
    getModals(wrapper)[1].vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();
    expect(vm.dialogState.open).toBe(false);

    // 2. Via the "확인" button (since the dialog is positioned in front of the footer, it is the first element).
    vm.dialogState.open = true;
    await wrapper.vm.$nextTick();
    await wrapper.findAll('.rcp-btn--close')[0].trigger('click');
    expect(vm.dialogState.open).toBe(false);
  });

  it('Confirm dialog: @update:open, confirm button and cancel button', async () => {
    const wrapper = await mountModal();
    const vm = wrapper.vm as unknown as ComponentVm;

    // 1. @update:open="confirmState.open = $event"
    getModals(wrapper)[2].vm.$emit('update:open', true);
    await wrapper.vm.$nextTick();
    expect(vm.confirmState.open).toBe(true);

    // 2. Confirm button -> calls onConfirm
    const onConfirm = vi.fn();
    vm.confirmState.onConfirm = onConfirm;
    await wrapper.vm.$nextTick();
    const actionBtns = wrapper.findAll('.dialog-actions .base-button-stub');
    expect(actionBtns.length).toBe(2);
    await actionBtns[0].trigger('click');
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // 3. Button 취소 -> close confirm
    await actionBtns[1].trigger('click');
    expect(vm.confirmState.open).toBe(false);

    // 4. @update:open false
    vm.confirmState.open = true;
    getModals(wrapper)[2].vm.$emit('update:open', false);
    await wrapper.vm.$nextTick();
    expect(vm.confirmState.open).toBe(false);
  });
});
