import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RemoteRecipeDialog from 'src/components/esheet/RemoteRecipeDialog.vue';
import { ROUTE } from 'src/constants/routes';
import { useMainStore } from 'src/features/main/stores/main.store';
import RemoteMeasProductCard from 'src/features/remote-meas/components/RemoteMeasProductCard.vue';
import { mockRemoteMeasLotInfo } from 'src/features/remote-meas/mocks/remote-meas.mock';
import RemoteMeasPage from 'src/features/remote-meas/pages/RemoteMeasPage.vue';
import { remoteMeasService } from 'src/features/remote-meas/services/remote-meas.service';
import { useRemoteMeasStore } from 'src/features/remote-meas/stores/remote-meas.store';
import { NATIVE_ENTER_EVENT } from 'src/utils/native-enter-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('RemoteMeasPage.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    const main = useMainStore();
    main.facility = 'FAB2';
    main.operatorId = 'OP_TEST';
    main.operatorName = 'Tester';

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>home</div>' } },
        { path: `/${ROUTE.measRemote}`, component: RemoteMeasPage },
        { path: `/${ROUTE.waferSelect}`, component: { template: '<div>wafer-select</div>' } },
        { path: `/${ROUTE.commentList}`, component: { template: '<div>comment-list</div>' } },
      ],
    });
    await router.push(`/${ROUTE.measRemote}`);

    vi.spyOn(remoteMeasService, 'fetchLotInfo').mockResolvedValue({
      ok: true,
      data: { ...mockRemoteMeasLotInfo },
    });
  });

  function createWrapper() {
    return mount(RemoteMeasPage, {
      global: {
        plugins: [router],
        stubs: {
          QIcon: { template: '<i class="q-icon" />' },
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
            name: 'RemoteRecipeDialog',
            props: ['modelValue', 'recipeList', 'lotNo'],
            emits: ['confirm', 'cancel'],
            template: '<div v-if="modelValue" class="recipe-dialog-stub" />',
          },
        },
      },
    });
  }

  it('renders page header with REMOTE START', () => {
    const wrapper = createWrapper();
    const header = wrapper.find('.remote-meas-header h1');
    expect(header.exists()).toBe(true);
    expect(header.text()).toBe('REMOTE START');
  });

  it('renders product, detail, and comment cards', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('.remote-meas-card--product').exists()).toBe(true);
    expect(wrapper.find('.remote-meas-card--detail').exists()).toBe(true);
    expect(wrapper.find('.remote-meas-card--comment').exists()).toBe(true);
    expect(wrapper.find('.remote-meas-footer').exists()).toBe(true);
  });

  it('initializes screen when route query lotId is present', async () => {
    const store = useRemoteMeasStore();
    const initSpy = vi.spyOn(store, 'initScreen');

    await router.push({ path: `/${ROUTE.measRemote}`, query: { lotId: 'LOT-TEST-01' } });
    createWrapper();
    await flushPromises();

    expect(initSpy).toHaveBeenCalledWith('LOT-TEST-01');
    await router.push(`/${ROUTE.measRemote}`);
  });

  it('navigates back on cancel button click', async () => {
    await router.push(`/${ROUTE.measRemote}`);
    const backSpy = vi.spyOn(router, 'back');
    const wrapper = createWrapper();

    const footerButtons = wrapper.findAll('.remote-meas-footer__btn');
    const cancelBtn = footerButtons.find((btn) => btn.text().includes('취소'));
    expect(cancelBtn?.exists()).toBe(true);

    await cancelBtn?.trigger('click');
    expect(backSpy).toHaveBeenCalled();
  });

  it('handles barcode scanner equipment input with EQP- prefix on native-enter event', async () => {
    const store = useRemoteMeasStore();
    const eqpSpy = vi.spyOn(store, 'getMachineInfo').mockResolvedValue(true);

    const wrapper = createWrapper();
    await flushPromises();

    store.procEqpId = 'EQP-MEQP-01a';
    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(store.procEqpId).toBe('MEQP-01');
    expect(eqpSpy).toHaveBeenCalledWith('MEQP-01');
    wrapper.unmount();
  });

  it('shows error dialog when machine enter is triggered with empty input', async () => {
    const store = useRemoteMeasStore();
    store.procEqpId = '   ';
    const wrapper = createWrapper();
    await flushPromises();

    window.dispatchEvent(new Event(NATIVE_ENTER_EVENT));
    await flushPromises();

    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('진행장비를 입력하세요.');
    wrapper.unmount();
  });

  it('parses production machine barcode on prod-machine-enter', async () => {
    const store = useRemoteMeasStore();
    const wrapper = createWrapper();
    await flushPromises();

    store.prodMachine = 'EQP-PROD01a';
    const productCard = wrapper.findComponent(RemoteMeasProductCard);
    productCard.vm.$emit('prod-machine-enter');
    await flushPromises();

    expect(store.prodMachine).toBe('PROD01');
    wrapper.unmount();
  });

  it('handles port change from product card', async () => {
    const store = useRemoteMeasStore();
    const portSpy = vi.spyOn(store, 'fetchPortStatus').mockResolvedValue();
    const wrapper = createWrapper();
    await flushPromises();

    const productCard = wrapper.findComponent(RemoteMeasProductCard);
    productCard.vm.$emit('update:selectedPort', 'PORT2');
    await flushPromises();

    expect(store.selectedPort).toBe('PORT2');
    expect(portSpy).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows alert when onSelectWafer is called without lotId', async () => {
    const store = useRemoteMeasStore();
    const wrapper = createWrapper();
    await flushPromises();

    store.lotId = '';
    const productCard = wrapper.findComponent(RemoteMeasProductCard);
    productCard.vm.$emit('select-wafer');
    await flushPromises();

    expect(store.alertDialog.open).toBe(true);
    expect(store.alertDialog.message).toBe('진행할 LOT을 먼저 입력하세요.');
    wrapper.unmount();
  });

  it('fetches slot info and navigates to waferSelect when onSelectWafer has lotId', async () => {
    const store = useRemoteMeasStore();
    vi.spyOn(remoteMeasService, 'fetchSlotInfo').mockResolvedValue({
      ok: true,
      message: '',
      data: {
        waferList: '1,2,3',
        quantity: 3,
        checkEtch: 'N',
      },
    });

    const pushSpy = vi.spyOn(router, 'push');
    const wrapper = createWrapper();
    await flushPromises();

    store.lotId = 'LOT-TEST-01';
    const productCard = wrapper.findComponent(RemoteMeasProductCard);
    productCard.vm.$emit('select-wafer');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({ path: `/${ROUTE.waferSelect}` });
    wrapper.unmount();
  });

  it('navigates to commentList on read-comment', async () => {
    const store = useRemoteMeasStore();
    store.lotId = 'LOT-TEST-01';
    const pushSpy = vi.spyOn(router, 'push');
    const wrapper = createWrapper();
    await flushPromises();

    const commentCard = wrapper.findComponent({ name: 'RemoteMeasCommentCard' });
    commentCard.vm.$emit('read-comment');
    await flushPromises();

    expect(pushSpy).toHaveBeenCalledWith({
      path: `/${ROUTE.commentList}`,
      query: expect.objectContaining({
        lotId: 'LOT-TEST-01',
        facility: 'FAB2',
      }),
    });
    wrapper.unmount();
  });

  it('triggers start action and recipe confirm flow', async () => {
    const store = useRemoteMeasStore();
    const startSpy = vi.spyOn(store, 'validateAndStart').mockResolvedValue(true);
    const submitSpy = vi.spyOn(store, 'submitRemoteStart').mockResolvedValue(true);

    const wrapper = createWrapper();
    await flushPromises();

    const footer = wrapper.findComponent({ name: 'RemoteMeasFooter' });
    footer.vm.$emit('start');
    await flushPromises();
    expect(startSpy).toHaveBeenCalled();

    store.recipeDialog.open = true;
    await flushPromises();

    const recipeDialog = wrapper.findComponent(RemoteRecipeDialog);
    recipeDialog.vm.$emit('confirm');
    await flushPromises();
    expect(submitSpy).toHaveBeenCalled();

    wrapper.unmount();
  });

  it('closes alert dialog when clicking OK', async () => {
    const store = useRemoteMeasStore();
    const wrapper = createWrapper();
    await flushPromises();

    store.showAlert('에  러', 'Test Error Message');
    expect(store.alertDialog.open).toBe(true);

    store.closeAlert();
    expect(store.alertDialog.open).toBe(false);
    wrapper.unmount();
  });

  it('handles confirm dialog callbacks', async () => {
    const store = useRemoteMeasStore();
    const wrapper = createWrapper();
    await flushPromises();

    const onConfirmMock = vi.fn();
    store.showConfirm({
      title: 'Confirm Title',
      message: 'Confirm Message',
      onConfirm: onConfirmMock,
    });
    expect(store.confirmDialog.open).toBe(true);

    store.confirmDialog.onConfirm?.();
    expect(onConfirmMock).toHaveBeenCalled();

    store.closeConfirm();
    expect(store.confirmDialog.open).toBe(false);
    wrapper.unmount();
  });
});
