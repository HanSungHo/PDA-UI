import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseRadioGroup } from 'src/components/base';
import OkDialog from 'src/components/OkDialog.vue';
import MachineInformPage from 'src/features/machine-inform/pages/MachineInformPage.vue';
import { machineInformService } from 'src/features/machine-inform/services/machine-inform.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import { okDialog } from 'src/services/ok-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('src/features/machine-inform/services/machine-inform.service', () => ({
  machineInformService: { getMachineInform: vi.fn(), addMachineInform: vi.fn() },
}));

describe('MachineInformPage', () => {
  afterEach(() => {
    okDialog.confirm();
    okDialog.message.value = '';
    okDialog.title.value = '';
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(machineInformService.getMachineInform).mockResolvedValue('');
    vi.mocked(machineInformService.addMachineInform).mockResolvedValue('saved');
  });

  async function setup(query = '') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/machine-inform', component: MachineInformPage },
        { path: '/', component: { template: '<div>Home</div>' } },
      ],
    });
    const store = useMainStore();
    store.facility = 'FAB1';
    store.operatorId = 'OP1';
    await router.push(`/machine-inform${query}`);
    await router.isReady();
    const wrapper = mount(MachineInformPage, { global: { plugins: [router] } });
    await flushPromises();
    return { wrapper, router };
  }

  it('shows the legacy labels and full width empty design', async () => {
    const { wrapper } = await setup();
    expect(wrapper.get('h1').text()).toBe('장비 INFORM');
    expect(wrapper.text()).toContain('장비');
    expect(wrapper.text()).toContain('공정');
    expect(wrapper.text()).toContain('EMPTY');
    expect(wrapper.text()).toContain('해당 결과가 없습니다');
    expect(wrapper.find('.machine-inform').exists()).toBe(true);
    wrapper.unmount();
  });

  it('loads the incoming machine, switches type, then saves and reloads content', async () => {
    const { wrapper } = await setup('?MACHINENAME=eqp-01');
    expect(machineInformService.getMachineInform).toHaveBeenCalledWith({
      factoryName: 'FAB1',
      type: 'MACHINE',
      machineName: 'EQP-01',
    });
    wrapper.findComponent(BaseRadioGroup).vm.$emit('update:modelValue', 'PROCESS');
    await flushPromises();
    expect(machineInformService.getMachineInform).toHaveBeenCalledWith({
      factoryName: 'FAB1',
      type: 'PROCESS',
      machineName: 'EQP-01',
    });
    await wrapper.get('.machine-inform__content').trigger('click');
    await wrapper.get('textarea').setValue('new content');
    await wrapper.get('.ds-screen__ok').trigger('click');
    await flushPromises();
    expect(machineInformService.addMachineInform).toHaveBeenCalledWith({
      factoryName: 'FAB1',
      type: 'PROCESS',
      machineName: 'EQP-01',
      content: 'new content',
      userId: 'OP1',
    });
    expect(machineInformService.getMachineInform).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('keeps the current content and shows an error when save fails', async () => {
    vi.mocked(machineInformService.addMachineInform).mockRejectedValue(new Error('Server failed'));
    const { wrapper } = await setup();
    await wrapper.get('.machine-inform__content').trigger('click');
    await wrapper.get('textarea').setValue('draft');
    await wrapper.get('.ds-screen__ok').trigger('click');
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('draft');
    expect(okDialog.message.value).toBe('Server failed');
    wrapper.unmount();
  });

  it('shows loading instead of EMPTY until the incoming note has loaded', async () => {
    let resolveNote!: (note: string) => void;
    vi.mocked(machineInformService.getMachineInform).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNote = resolve;
        }),
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/machine-inform', component: MachineInformPage }],
    });
    await router.push('/machine-inform?MACHINENAME=EQP-01');
    await router.isReady();
    const wrapper = mount(MachineInformPage, { global: { plugins: [router] } });
    expect(wrapper.find('.machine-inform__loading').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('EMPTY');
    resolveNote('Saved note');
    await flushPromises();
    expect(wrapper.find('.machine-inform__loading').exists()).toBe(false);
    expect(wrapper.get('textarea').element.value).toBe('Saved note');
    wrapper.unmount();
  });

  it('uses the shared radio group and maps scanner input like BarcodeStyle.eqpId', async () => {
    const { wrapper } = await setup();
    expect(wrapper.findComponent(BaseRadioGroup).props('options')).toEqual([
      { label: '장비', value: 'MACHINE' },
      { label: '공정', value: 'PROCESS' },
    ]);
    await wrapper.get('.machine-inform__input input').setValue('EQP-ABC9');
    await wrapper.get('.machine-inform__input input').trigger('keyup.enter');
    await flushPromises();
    expect(machineInformService.getMachineInform).toHaveBeenCalledWith(
      expect.objectContaining({ machineName: 'ABC' }),
    );
    wrapper.unmount();
  });

  it('shows READING ERROR and clears the machine when the scan is not EQP-xxxx', async () => {
    const { wrapper } = await setup();
    const input = wrapper.get('.machine-inform__input input');
    await input.setValue('abc');
    await input.trigger('keyup.enter');
    await flushPromises();
    expect(machineInformService.getMachineInform).not.toHaveBeenCalled();
    expect(okDialog.isOpen.value).toBe(true);
    expect(okDialog.title.value).toBe('READING ERROR');
    expect(okDialog.message.value).toBe('진행할 장비를 읽어주세요.');
    expect((input.element as HTMLInputElement).value).toBe('');
    wrapper.findComponent(OkDialog).vm.$emit('confirm');
    await flushPromises();
    expect(okDialog.isOpen.value).toBe(false);
    wrapper.unmount();
  });

  it('resets the loaded content when the machine name is edited', async () => {
    vi.mocked(machineInformService.getMachineInform).mockResolvedValue('old note');
    const { wrapper } = await setup('?MACHINENAME=EQP-01');
    expect(wrapper.get('textarea').element.value).toBe('old note');
    const input = wrapper.get('.machine-inform__input input');
    await input.setValue('eqp-02');
    expect(wrapper.get('textarea').element.value).toBe('');
    expect((input.element as HTMLInputElement).value).toBe('EQP-02');
    await input.setValue('EQP-02');
    expect(wrapper.get('textarea').element.value).toBe('');
    wrapper.unmount();
  });

  it('queries with the search button and shows the error when loading fails', async () => {
    vi.mocked(machineInformService.getMachineInform).mockRejectedValue(new Error('Load failed'));
    const { wrapper } = await setup('?MACHINENAME=EQP-01');
    expect(okDialog.message.value).toBe('Load failed');
    vi.mocked(machineInformService.getMachineInform).mockRejectedValue('plain failure');
    await wrapper.get('.machine-inform__search-button').trigger('click');
    await flushPromises();
    expect(machineInformService.getMachineInform).toHaveBeenCalledTimes(2);
    expect(okDialog.message.value).toBe('plain failure');
    wrapper.unmount();
  });

  it('ignores a stale response after the machine name changes', async () => {
    let resolveFirst!: (note: string) => void;
    vi.mocked(machineInformService.getMachineInform).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { wrapper } = await setup('?MACHINENAME=EQP-01');
    await wrapper.get('.machine-inform__input input').setValue('EQP-02');
    resolveFirst('stale');
    await flushPromises();
    expect(wrapper.get('textarea').element.value).toBe('');
    wrapper.unmount();
  });

  it('ignores a stale failure after the machine name changes', async () => {
    let rejectFirst!: (error: Error) => void;
    vi.mocked(machineInformService.getMachineInform).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    const { wrapper } = await setup('?MACHINENAME=EQP-01');
    await wrapper.get('.machine-inform__input input').setValue('EQP-02');
    rejectFirst(new Error('stale error'));
    await flushPromises();
    expect(okDialog.message.value).toBe('');
    wrapper.unmount();
  });

  it('ignores an unknown radio value and the already selected type', async () => {
    const { wrapper } = await setup('?MACHINENAME=EQP-01');
    const radios = wrapper.findComponent(BaseRadioGroup);
    radios.vm.$emit('update:modelValue', 'OTHER');
    radios.vm.$emit('update:modelValue', 'MACHINE');
    await flushPromises();
    expect(machineInformService.getMachineInform).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('does not enter edit mode or save while loading, and closes with router.back', async () => {
    vi.mocked(machineInformService.getMachineInform).mockImplementation(
      () => new Promise(() => {}),
    );
    const { wrapper, router } = await setup('?MACHINENAME=EQP-01');
    await wrapper.get('.machine-inform__content').trigger('click');
    await wrapper.get('.ds-screen__ok').trigger('click');
    expect(machineInformService.addMachineInform).not.toHaveBeenCalled();
    const back = vi.spyOn(router, 'back');
    await wrapper.get('.ds-screen__cancel').trigger('click');
    expect(back).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows the error message when save rejects with a non-Error value', async () => {
    vi.mocked(machineInformService.addMachineInform).mockRejectedValue('save refused');
    const { wrapper } = await setup();
    await wrapper.get('.ds-screen__ok').trigger('click');
    await flushPromises();
    expect(okDialog.message.value).toBe('save refused');
    wrapper.unmount();
  });
});
