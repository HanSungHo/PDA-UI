import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import FurnaceActionFooter from 'src/features/remote-furnace/components/FurnaceActionFooter.vue';
import FurnaceBatchTable from 'src/features/remote-furnace/components/FurnaceBatchTable.vue';
import FurnaceProductInfoCard from 'src/features/remote-furnace/components/FurnaceProductInfoCard.vue';
import RemoteFurnacePage from 'src/features/remote-furnace/pages/RemoteFurnacePage.vue';
import { useRemoteFurnaceStore } from 'src/features/remote-furnace/stores/remote-furnace.store';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('RemoteFurnacePage.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: `/${ROUTE.esheet}`, component: { template: '<div>esheet</div>' } },
        { path: `/${ROUTE.main}`, component: { template: '<div>main</div>' } },
        { path: `/${ROUTE.commentList}`, component: { template: '<div>comment</div>' } },
      ],
    });
  });

  function createWrapper() {
    return mount(RemoteFurnacePage, {
      global: {
        plugins: [router],
        stubs: {
          QIcon: { template: '<i class="q-icon" />' },
          FurnaceProductInfoCard: {
            template: '<div class="product-info-stub" />',
            methods: { focusMachineInput: vi.fn() },
          },
          FurnaceBatchTable: { template: '<div class="batch-table-stub" />' },
          FurnaceActionFooter: { template: '<div class="action-footer-stub" />' },
          BaseLoading: { template: '<div class="base-loading-stub" />' },
          BaseModal: {
            props: ['open', 'title'],
            template: `
              <div v-if="open" class="modal-stub">
                <slot />
                <slot name="footer" />
              </div>
            `,
          },
          BaseButton: {
            props: ['label'],
            template:
              '<button type="button" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
          },
          RemoteRecipeDialog: {
            props: ['modelValue'],
            template: '<div v-if="modelValue" class="recipe-dialog-stub" />',
          },
        },
      },
    });
  }

  it('mounts and initializes screen with query lotId', async () => {
    await router.push({ path: '/', query: { lotId: 'LOT-123' } });
    const store = useRemoteFurnaceStore();
    const initSpy = vi.spyOn(store, 'initScreen').mockResolvedValue();

    const wrapper = createWrapper();
    await flushPromises();

    expect(initSpy).toHaveBeenCalledWith('LOT-123');
    expect(wrapper.find('h1').text()).toBe('Furnace 자동화');

    store.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.furnace-loading-overlay').exists()).toBe(true);

    wrapper.unmount();
  });

  it('supports array query lotId', async () => {
    await router.push({ path: '/', query: { lotId: ['LOT-ARRAY'] } });
    const store = useRemoteFurnaceStore();
    const initSpy = vi.spyOn(store, 'initScreen').mockResolvedValue();

    const wrapper = createWrapper();
    await flushPromises();

    expect(initSpy).toHaveBeenCalledWith('LOT-ARRAY');
    wrapper.unmount();
  });

  it('navigates to esheet on cancel when lotId exists', async () => {
    await router.push({ path: '/', query: { lotId: 'LOT-123' } });
    const store = useRemoteFurnaceStore();
    vi.spyOn(store, 'initScreen').mockImplementation(async () => {
      store.lotId = 'LOT-123';
    });
    const replaceSpy = vi.spyOn(router, 'replace');

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.findComponent(FurnaceActionFooter).vm.$emit('cancel');
    expect(replaceSpy).toHaveBeenCalledWith({
      path: `/${ROUTE.esheet}`,
      query: { lotId: 'LOT-123' },
    });
  });

  it('navigates to main on cancel when lotId is empty', async () => {
    await router.push({ path: '/' });
    const store = useRemoteFurnaceStore();
    vi.spyOn(store, 'initScreen').mockImplementation(async () => {
      store.lotId = '';
    });
    const replaceSpy = vi.spyOn(router, 'replace');

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.findComponent(FurnaceActionFooter).vm.$emit('cancel');
    expect(replaceSpy).toHaveBeenCalledWith({ path: `/${ROUTE.main}` });
  });

  it('handles alert modal close', async () => {
    const store = useRemoteFurnaceStore();
    vi.spyOn(store, 'initScreen').mockResolvedValue();

    const wrapper = createWrapper();
    await flushPromises();

    store.alertDialog = {
      open: true,
      title: '경고',
      message: '설비 정보가 없습니다.',
    };
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('설비 정보가 없습니다.');
    await wrapper.find('.modal-stub button').trigger('click');
    expect(store.alertDialog.open).toBe(false);
  });

  it('handles confirm modal accept and cancel callbacks', async () => {
    const store = useRemoteFurnaceStore();
    const confirmCb = vi.fn();
    const cancelCb = vi.fn();
    store.confirmDialog = {
      open: true,
      title: '확인',
      message: '진행하시겠습니까?',
      confirmText: '예',
      cancelText: '아니오',
      onConfirm: confirmCb,
      onCancel: cancelCb,
    };

    const wrapper = createWrapper();
    await flushPromises();

    const buttons = wrapper.findAll('.modal-stub button');
    expect(buttons.length).toBe(2);

    await buttons[0]!.trigger('click');
    expect(cancelCb).toHaveBeenCalled();

    store.confirmDialog.open = true;
    store.confirmDialog.onConfirm = confirmCb;
    await wrapper.vm.$nextTick();

    const buttonsAfter = wrapper.findAll('.modal-stub button');
    await buttonsAfter[1]!.trigger('click');
    expect(confirmCb).toHaveBeenCalled();
  });

  it('handles native enter keyboard event', async () => {
    const store = useRemoteFurnaceStore();
    const machineEnterSpy = vi.spyOn(store, 'handleProcessingMachineInput').mockResolvedValue();

    const wrapper = createWrapper();
    await flushPromises();

    store.processingMachine = 'EQP-FN01X';
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(machineEnterSpy).toHaveBeenCalledWith('FN01');
    wrapper.unmount();
  });

  it('handles start click, recipe confirmed, and comment navigation', async () => {
    await router.push({ path: '/', query: { lotId: 'LOT-999' } });
    const store = useRemoteFurnaceStore();
    vi.spyOn(store, 'initScreen').mockImplementation(async () => {
      store.lotId = 'LOT-999';
    });
    vi.spyOn(store, 'triggerStartAction').mockResolvedValue(true);
    vi.spyOn(store, 'submitRemoteExecution').mockResolvedValue(true);
    const pushSpy = vi.spyOn(router, 'push');
    const replaceSpy = vi.spyOn(router, 'replace');

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.findComponent(FurnaceActionFooter).vm.$emit('start');
    expect(store.triggerStartAction).toHaveBeenCalled();

    wrapper.findComponent(FurnaceActionFooter).vm.$emit('restart');

    await wrapper.findComponent(RemoteRecipeDialog).vm.$emit('confirm');
    expect(replaceSpy).toHaveBeenCalledWith({
      path: `/${ROUTE.esheet}`,
      query: { lotId: 'LOT-999' },
    });

    const mainStore = useMainStore();
    mainStore.facility = 'FAB1';
    wrapper.findComponent(FurnaceBatchTable).vm.$emit('read-comment', {
      lotId: 'LOT-001',
      operation: 'OP1',
      subOperation: 'SUB1',
      processStep: 'STEP1',
      operSequence: '01',
    });
    expect(pushSpy).toHaveBeenCalledWith({
      path: `/${ROUTE.commentList}`,
      query: {
        lotId: 'LOT-001',
        operation: 'OP1',
        subOperation: 'SUB1',
        processStep: 'STEP1',
        operSequence: '01',
        facility: 'FAB1',
      },
    });

    vi.spyOn(store, 'checkInterlock').mockResolvedValue();
    await wrapper.findComponent(FurnaceProductInfoCard).vm.$emit('recipe-change', 'RCP-NEW');
    expect(store.selectedRecipe).toBe('RCP-NEW');
    expect(store.checkInterlock).toHaveBeenCalled();

    vi.spyOn(store, 'updatePortStatus').mockResolvedValue();
    await wrapper.findComponent(FurnaceProductInfoCard).vm.$emit('port-change', 'PORT2');
    expect(store.selectedPort).toBe('PORT2');
    expect(store.updatePortStatus).toHaveBeenCalled();

    store.lotId = '';
    await wrapper.findComponent(RemoteRecipeDialog).vm.$emit('confirm');
    expect(replaceSpy).toHaveBeenCalledWith({ path: `/${ROUTE.main}` });
  });

  it('handles mock, dismissAlert, and recipeDialog query parameters on mount', async () => {
    await router.push({
      path: '/',
      query: {
        lotId: 'WIP00001',
        mock: 'true',
        dismissAlert: 'true',
        recipeDialog: 'true',
      },
    });

    const store = useRemoteFurnaceStore();
    vi.spyOn(store, 'initScreen').mockResolvedValue();
    vi.spyOn(store, 'closeAlert');

    const wrapper = createWrapper();
    await flushPromises();

    expect(store.closeAlert).toHaveBeenCalled();
    expect(store.recipeDialog.open).toBe(true);

    // Native enter event test
    store.processingMachine = 'EQP-FN01X';
    vi.spyOn(store, 'handleProcessingMachineInput').mockResolvedValue();
    window.dispatchEvent(new CustomEvent(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(store.handleProcessingMachineInput).toHaveBeenCalledWith('FN01');
    wrapper.unmount();
  });
});
