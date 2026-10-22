import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BackupBayDialog from 'src/components/esheet/BackupBayDialog.vue';
import ESheetProcessGrid from 'src/features/esheet/components/ESheetProcessGrid.vue';
import MaskLocationDialog from 'src/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import * as esheetService from 'src/features/esheet/services/esheet.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  createRemoteFurnaceKjMockApi,
  resetRemoteFurnaceKjApi,
  setRemoteFurnaceKjApi,
  useRemoteFurnaceKjStore,
} from 'src/features/remote-furnace-kj';
import { useRemoteRamcoStore } from 'src/features/remote-ramco';
import ESheetPage from 'src/pages/ESheetPage.vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

const ErrorDialogStub = defineComponent({
  props: {
    open: { type: Boolean, required: true },
    title: { type: String, default: '' },
    closable: { type: Boolean, default: true },
    overlayClosable: { type: Boolean, default: true },
    width: { type: Number, default: 340 },
  },
  emits: ['cancel', 'update:open'],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h('section', { role: 'dialog', 'aria-label': props.title }, [
            h('h2', props.title),
            slots.default?.(),
            slots.footer?.(),
          ])
        : null;
  },
});

describe('ESheetPage', () => {
  it('opens Shelf Incoming from S without extras and retains the parent draft after closing', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/esheet',
          component: ESheetPage,
          children: [{ path: 'shelf-incoming', component: { template: '<div>SHELF CHILD</div>' } }],
        },
      ],
    });
    await router.push('/esheet');
    await router.isReady();
    const wrapper = mount(
      { template: '<router-view />' },
      { global: { plugins: [createPinia(), router] } },
    );
    try {
      await wrapper.get('input[aria-label="LOT"]').setValue('LOT-DRAFT');
      await wrapper.get('.mode-tabs button:first-child').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/esheet/shelf-incoming');
      expect(router.currentRoute.value.query).toEqual({});
      expect(wrapper.text()).toContain('SHELF CHILD');
      router.back();
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').element.value).toBe(
        'LOT-DRAFT',
      );
    } finally {
      wrapper.unmount();
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetRemoteFurnaceKjApi();
  });

  it('renders the mock LOT screen and supports the main interactions', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const deviceInfo = useMainStore();
    deviceInfo.$patch({ facility: 'FAB-A', forwardCount: '8', historyCount: '12' });
    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/esheet-edc', component: { template: '<div />' } },
        { path: '/een-setting', component: { template: '<div />' } },
        { path: '/comment-list', component: { template: '<div />' } },
        { path: '/', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const lotInput = () => wrapper.get<HTMLInputElement>('input[aria-label="LOT"]');
      expect(wrapper.get('h1').text()).toBe('ESHEET');
      expect(wrapper.get('.summary-field--empty').text()).toContain('Null');
      expect(wrapper.get('.action-bar button.primary').text()).toBe('母 LOT');
      expect(wrapper.findAll('.esheet-field-clear')).toHaveLength(5);
      expect(wrapper.findAll('.esheet-field-clear__icon')).toHaveLength(5);
      expect(lotInput().element.value).toBe('WP00001');
      const processGrid = () => wrapper.getComponent(ESheetProcessGrid);
      expect(processGrid().props('rows')).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'BARC COATING' })]),
      );

      expect(processGrid().props('selectedProcessId')).toBe('P00002:00:1');
      expect(lookup).toHaveBeenCalledWith({
        facility: 'FAB-A',
        forwardCount: '8',
        historyCount: '12',
        lotId: 'WP00001',
      });
      expect(processGrid().props('rows')[1].commentCount).toBe('1');
      expect(wrapper.get('.status--normal').attributes('aria-label')).toBe('Normal 상태 삭제');
      expect(wrapper.get('.quantity').attributes('aria-label')).toBe('25 수량 삭제');
      expect(wrapper.get('.status--wait').attributes('aria-label')).toBe('WAIT 상태 삭제');
      const scrollbars = wrapper.findAll('[role="scrollbar"]');
      expect(scrollbars).toHaveLength(2);
      for (const scrollbar of scrollbars) {
        expect(scrollbar.attributes('tabindex')).toBe('0');
        expect(scrollbar.attributes('aria-valuemin')).toBe('0');
      }

      await lotInput().setValue(' wp00001 ');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();
      expect(lotInput().element.value).toBe('WP00001');
      expect(wrapper.text()).not.toContain('Loaded LOT data WP00001');
      expect(document.activeElement).toBe(lotInput().element);
      expect(lotInput().element.selectionStart).toBe(0);
      expect(lotInput().element.selectionEnd).toBe('WP00001'.length);

      await wrapper.get('.mode-tabs button:nth-child(2)').trigger('click');
      expect(wrapper.getComponent(BackupBayDialog).props('modelValue')).toBe(true);
      expect(wrapper.text()).toContain('Backup Bay 변경');
      wrapper.getComponent(BackupBayDialog).vm.$emit('update:modelValue', false);
      await wrapper.vm.$nextTick();

      await wrapper.get('.mode-tabs button:nth-child(3)').trigger('click');
      expect(wrapper.text()).toContain('마스크 위치정보');
      expect(wrapper.find('.mask-location-dialog__title').exists()).toBe(true);
      expect(wrapper.getComponent(MaskLocationDialog).props('lotId')).toBe('WP00001');
      await wrapper.get('.mask-location-dialog .dialog-ok-button').trigger('click');
      expect(wrapper.find('.mask-location-dialog').exists()).toBe(false);
      await wrapper.get('.action-bar button.primary').trigger('click');
      expect(wrapper.text()).not.toContain('LOT selected');
      await wrapper.get('.action-bar button:nth-child(2)').trigger('click');
      expect(wrapper.text()).not.toContain('PCM opened');
      await wrapper.get('.action-bar button:nth-child(3)').trigger('click');
      expect(wrapper.text()).not.toContain('F opened');
      expect(processGrid().props('rows')).toHaveLength(20);

      processGrid().vm.$emit('select', 'P00001:00:0');
      await wrapper.vm.$nextTick();
      expect(processGrid().props('selectedProcessId')).toBe('P00001:00:0');

      expect(wrapper.find('.annotation-toggle').exists()).toBe(false);
      processGrid().vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      processGrid().vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[role="dialog"]').text()).toContain('COMMENT');
      expect(wrapper.getComponent({ name: 'DrawMenuList' }).props('row')).toMatchObject({
        COMMENTCNT: '1',
        ISCURRENT: 'Y',
      });
      await wrapper.get('[data-action-id="move-in"]').trigger('click');
      expect(wrapper.get('.draw-menu-list').attributes('aria-hidden')).toBe('true');
      expect(wrapper.text()).not.toContain('MOVE IN awaiting integration.');
      processGrid().vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      const commentAction = wrapper.get('[data-action-id="comment"]');
      expect(commentAction.attributes('disabled')).toBeUndefined();
      await commentAction.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/comment-list');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'WP00001',
        operation: 'P00002',
        processStep: 'BARC COATING',
      });
      processGrid().vm.$emit('openEdc', {
        ...processGrid().props('rows')[1],
        isDcol: 'Y',
        realRecipe: 'RCP-EDC-01',
      });
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/esheet-edc');
      expect(router.currentRoute.value.query).toEqual({
        LOTID: 'WP00001',
        OPERATION: 'P00002',
        SUBOPERATION: '00',
        PROCESSSTEP: 'BARC COATING',
        REALRECIPE: 'RCP-EDC-01',
      });
      await flushPromises();
    } finally {
      wrapper.unmount();
    }
  });

  it('opens EEN Setting with the selected process and LOT context from the draw menu', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/een-setting', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, { global: { plugins: [pinia, router] } });
    try {
      await flushPromises();
      wrapper.getComponent(ESheetProcessGrid).vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      await wrapper.get('[data-action-id="setting-een"]').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/een-setting');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'WP00001',
        factoryName: 'GUMI',
        product: 'P-DM-TEST-6F',
        route: 'BP04',
        operation: 'P00002',
        processStep: 'BARC COATING',
        facility: 'GUMI',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('does not search automatically when no LOT was passed in the route', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, { global: { plugins: [pinia, router] } });
    try {
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').element.value).toBe('');
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toEqual([]);
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.get('.mode-tabs button:nth-child(3)').attributes('disabled')).toBeDefined();
      expect(lookup).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('opens standalone EEN Add from the zero-comment EEN menu action with legacy context', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const deviceInfo = useMainStore();
    deviceInfo.$patch({ facility: 'FAB-A', forwardCount: '8', historyCount: '12' });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/een-add', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const processGrid = wrapper.getComponent(ESheetProcessGrid);
      processGrid.vm.$emit('select', 'P00001:00:0');
      await wrapper.vm.$nextTick();
      processGrid.vm.$emit('openMenu', 'P00001:00:0');
      await wrapper.vm.$nextTick();

      const eenAction = wrapper.get('[data-action-id="setting-een"]');
      expect(eenAction.attributes('disabled')).toBeUndefined();
      await eenAction.trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/een-add');
      expect(router.currentRoute.value.query).toMatchObject({
        LOTID: 'WP00001',
        FACTORYNAME: 'GUMI',
        PRODUCT: 'P-DM-TEST-6F',
        ROUTE: 'BP04',
        OPERATION: 'P00001-00',
        PROCESSSTEP: 'PHOTO',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('routes the Furnace menu to KEC when the mock classification is KEC', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const api = createRemoteFurnaceKjMockApi('classification-kec');
    const check = vi.spyOn(api, 'checkFurnaceKj');
    setRemoteFurnaceKjApi(api);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/furnace-remote', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const processGrid = wrapper.getComponent(ESheetProcessGrid);
      processGrid.vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      processGrid.vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();

      await wrapper.get('[data-action-id="furnace-auto"]').trigger('click');
      await flushPromises();

      expect(check).toHaveBeenCalledWith({ LOTID: 'WP00001' });
      expect(router.currentRoute.value.path).toBe('/furnace-remote');
      expect(router.currentRoute.value.query).toEqual({ LOTID: 'WP00001' });
    } finally {
      wrapper.unmount();
    }
  });

  it('routes the Furnace menu to KJ when the mock classification returns CNT zero', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const api = createRemoteFurnaceKjMockApi();
    const check = vi.spyOn(api, 'checkFurnaceKj');
    setRemoteFurnaceKjApi(api);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/remote-furnace-kj', component: { template: '<div>KJ</div>' } },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const processGrid = wrapper.getComponent(ESheetProcessGrid);
      processGrid.vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      await wrapper.get('[data-action-id="furnace-auto"]').trigger('click');
      await flushPromises();

      expect(check).toHaveBeenCalledWith({ LOTID: 'WP00001' });
      expect(router.currentRoute.value.path).toBe('/remote-furnace-kj');
      expect(router.currentRoute.value.query).toEqual({ lotId: 'WP00001' });
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the legacy error dialog when the LOT field is empty', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('LOT NO를 입력하세요');
      expect(dialog.text()).toContain('확인');
      expect(lookup).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('formats and searches a valid scanned LOT on Enter', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, { global: { plugins: [pinia, router] } });
    try {
      await flushPromises();
      const lotInput = wrapper.get<HTMLInputElement>('input[aria-label="LOT"]');
      await lotInput.setValue(' $wp00001x');
      await lotInput.trigger('keyup.enter');
      await flushPromises();

      expect(lotInput.element.value).toBe('WP00001');
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toHaveLength(20);
    } finally {
      wrapper.unmount();
    }
  });

  it('rejects an unformatted LOT on Enter and restores focus without searching', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const lotInput = wrapper.get<HTMLInputElement>('input[aria-label="LOT"]');
      await lotInput.setValue('WP00001');
      await lotInput.trigger('keyup.enter');
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('READING ERROR');
      expect(dialog.text()).toContain('LOT#를 읽어주세요.');
      expect(dialog.text()).toContain('확인');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(lookup).not.toHaveBeenCalled();
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toEqual([]);

      await dialog.vm.$emit('update:open', false);
      await flushPromises();
      expect(document.activeElement).toBe(lotInput.element);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows an unsuccessful response message without mapping its payload', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.spyOn(esheetService, 'getESheetInfo').mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'No matching LOT', MSGBODY: {} }),
    } as unknown as Awaited<ReturnType<typeof esheetService.getESheetInfo>>);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('No matching LOT');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toEqual([]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows a dialog when a successful response has no ESHEETITEMS', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.spyOn(esheetService, 'getESheetInfo').mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { ESHEETITEMS: [] } }),
    } as unknown as Awaited<ReturnType<typeof esheetService.getESheetInfo>>);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('ESHEETITEMS가 존재하지 않습니다.');
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toEqual([]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows controlled lookup errors and restores focus to the LOT field', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const lotInput = wrapper.get<HTMLInputElement>('input[aria-label="LOT"]');
      await lotInput.setValue('unknown');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('LOT UNKNOWN을(를) 찾을 수 없습니다.');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toEqual([]);
      await dialog.vm.$emit('update:open', false);
      await flushPromises();
      expect(document.activeElement).toBe(lotInput.element);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the legacy error dialog when a LOT lookup throws', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.spyOn(esheetService, 'getESheetInfo').mockRejectedValueOnce(new Error('Connection failed'));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      await wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').setValue('WP00001');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('Connection failed');
      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('navigates to Remote Ramco from drawer action batch-auto with lot context', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/esheet', component: ESheetPage },
        { path: '/remote-ramco', component: defineComponent({ template: '<div>RAMCO</div>' }) },
      ],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const pushSpy = vi.spyOn(router, 'push');
    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const grid = wrapper.getComponent(ESheetProcessGrid);
      grid.vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      grid.vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();

      const batchAutoAction = wrapper.get('[data-action-id="batch-auto"]');
      expect(batchAutoAction.attributes('disabled')).toBeUndefined();
      await batchAutoAction.trigger('click');
      await flushPromises();

      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/remote-ramco',
          query: { lotId: 'WP00001' },
        }),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('searches lot automatically when returning from Remote Ramco via remoteRamcoStore', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const remoteRamcoStore = useRemoteRamcoStore();
    remoteRamcoStore.setReturnLotId('LOT-RETURNED');

    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').element.value).toBe(
        'LOT-RETURNED',
      );
      expect(lookup).toHaveBeenCalledWith(
        expect.objectContaining({
          lotId: 'LOT-RETURNED',
        }),
      );
    } finally {
      wrapper.unmount();
    }
  });

  it('reloads the successful Furnace KJ LOT once when eSheet is restored', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const remoteFurnaceKjStore = useRemoteFurnaceKjStore();
    remoteFurnaceKjStore.setReturnLotId('LOT-KJ-RETURN');

    const lookup = vi.spyOn(esheetService, 'getESheetInfo');
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      expect(wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').element.value).toBe(
        'LOT-KJ-RETURN',
      );
      expect(lookup).toHaveBeenCalledTimes(1);
      expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ lotId: 'LOT-KJ-RETURN' }));
      expect(remoteFurnaceKjStore.consumeReturnLotId()).toBe('');
    } finally {
      wrapper.unmount();
    }
  });
});
