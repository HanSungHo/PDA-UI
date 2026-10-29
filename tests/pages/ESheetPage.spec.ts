import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseButton } from 'src/components/base';
import BackupBayDialog from 'src/components/esheet/BackupBayDialog.vue';
import ESheetProcessGrid from 'src/features/esheet/components/ESheetProcessGrid.vue';
import MaskLocationDialog from 'src/features/esheet/components/mask-location-dialog/MaskLocationDialog.vue';
import * as esheetService from 'src/features/esheet/services/esheet.service';
import * as esheetActions from 'src/features/esheet/services/esheet-actions.service';
import { useMainStore } from 'src/features/main/stores/main.store';
import {
  createRemoteFurnaceKjMockApi,
  resetRemoteFurnaceKjApi,
  setRemoteFurnaceKjApi,
  useRemoteFurnaceKjStore,
} from 'src/features/remote-furnace-kj';
import { useRemoteRamcoStore } from 'src/features/remote-ramco';
import ESheetPage from 'src/pages/ESheetPage.vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { getESheetPageFixture } from '../fixtures/esheet-page.fixture';

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
  beforeEach(() => {
    vi.spyOn(esheetService, 'getESheetInfo').mockImplementation(async ({ lotId }) =>
      getESheetPageFixture(lotId),
    );
  });

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
        { path: '/move-in/:lotId', name: 'move-in', component: { template: '<div />' } },
        { path: '/', component: { template: '<div />' } },
      ],
    });
    await router.push('/esheet?lotId=WP-COMMENT');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    try {
      await flushPromises();
      const maskInfo = vi.spyOn(esheetActions, 'fetchESheetMaskInfo').mockResolvedValue({
        ok: true,
        data: [
          {
            RETICLETAG: 'MASK-001',
            PRODUCT: 'P-DM-TEST-6F',
            GIBEN: 'B01',
            STATUS: 'READY',
            ISUSE: 'Y',
            CURRLOC: 'PHOTO',
            SUBLOCATION3: 'EQP-01',
            AFTERINSP: '10:00',
          },
          {
            RETICLETAG: 'MASK-002',
            PRODUCT: 'P-DM-TEST-6F',
            GIBEN: 'B02',
            STATUS: 'READY',
            ISUSE: 'Y',
            CURRLOC: 'PHOTO',
            SUBLOCATION3: 'EQP-02',
            AFTERINSP: '11:00',
          },
        ],
      });
      vi.spyOn(esheetActions, 'fetchESheetPcmReworkRecipe').mockResolvedValue({
        ok: true,
        data: { PCMREQPLIST: 'EQP-A', RECIPELIST: 'RCP-A', PCMRESULT: 'OK' },
      });
      vi.spyOn(esheetActions, 'fetchESheetFutureActions').mockResolvedValue({
        ok: true,
        data: 'FUTURE HOLD',
      });
      const lotInput = () => wrapper.get<HTMLInputElement>('input[aria-label="LOT"]');
      expect(wrapper.get('h1').text()).toBe('eSheet (OPERATOR_NAME)');
      expect(wrapper.get<HTMLInputElement>('input[aria-label="정비 항목"]').element.value).toBe('');
      expect(wrapper.get('.ds-screen__actions button.primary').text()).toBe('母 LOT');
      expect(wrapper.findAll('.esheet-field-clear')).toHaveLength(0);
      // Figma layout: 조회 next to the LOT field, a one-line 잔여 field, 제품 beside 공정번호.
      expect(wrapper.get('button[aria-label="LOT 조회"]').text()).toBe('조회');
      expect(wrapper.find('[role="group"][aria-label="S P M"]').findAll('button')).toHaveLength(3);
      expect(wrapper.find('textarea').exists()).toBe(false);
      expect(wrapper.find('.lot-number input[aria-label="제품"]').exists()).toBe(true);
      expect(wrapper.get('.lot-number').text()).toContain('공정번호');
      // BaseScreen footer: 母 LOT and the three actions use the medium (36px) button size.
      const footerButtons = wrapper
        .findAllComponents(BaseButton)
        .filter((button) => Boolean(button.element.closest('.ds-screen__actions')));
      expect(footerButtons.map((button) => button.text())).toEqual(['母 LOT', 'PCM', 'F', '닫기']);
      expect(footerButtons.every((button) => button.classes('ds-btn--medium'))).toBe(true);
      expect(lotInput().element.value).toBe('WP-COMMENT');
      const processGrid = () => wrapper.getComponent(ESheetProcessGrid);
      expect(processGrid().props('rows')).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'BARC COATING' })]),
      );

      expect(processGrid().props('selectedProcessId')).toBe('P00001:00:0');
      expect(lookup).toHaveBeenCalledWith({
        facility: 'FAB-A',
        forwardCount: '8',
        historyCount: '12',
        lotId: 'WP-COMMENT',
      });
      expect(processGrid().props('rows')[1].commentCount).toBe('1');
      expect(wrapper.findAll('.status-chip').map((chip) => chip.text())).toEqual([
        'Normal',
        '25',
        'WAIT',
      ]);
      const fieldValue = (name: string) =>
        wrapper.get<HTMLInputElement>(`input[aria-label="${name}"]`).element.value;
      expect(
        ['BAY', 'JOB CODE', '현재 공정', 'RECIPE', '투입시간', '진행RCP', '기준장비'].map(
          fieldValue,
        ),
      ).toEqual(['BP04', '20151115', 'PHOTO', 'BEWH-K69-76-B81', '', '', 'PHOTO']);
      expect(fieldValue('ENGR2')).toBe('');

      await wrapper.get('input[aria-label="RECIPE"]').trigger('dblclick');
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('BEWH-K69-76-B81');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.get('input[aria-label="기준장비"]').trigger('keydown', { key: 'Enter' });
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('PHOTO');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      const scrollbars = wrapper.findAll('[role="scrollbar"]');
      expect(scrollbars).toHaveLength(2);
      for (const scrollbar of scrollbars) {
        expect(scrollbar.attributes('tabindex')).toBe('0');
        expect(scrollbar.attributes('aria-valuemin')).toBe('0');
      }

      await lotInput().setValue(' wp-comment ');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();
      expect(lotInput().element.value).toBe('WP-COMMENT');
      expect(wrapper.text()).not.toContain('Loaded LOT data WP-COMMENT');
      expect(document.activeElement).toBe(lotInput().element);
      expect(lotInput().element.selectionStart).toBe(0);
      expect(lotInput().element.selectionEnd).toBe('WP-COMMENT'.length);

      await wrapper.get('.mode-tabs button:nth-child(2)').trigger('click');
      expect(wrapper.getComponent(BackupBayDialog).props('modelValue')).toBe(true);
      expect(wrapper.text()).toContain('Backup Bay 변경');
      wrapper.getComponent(BackupBayDialog).vm.$emit('update:modelValue', false);
      await wrapper.vm.$nextTick();

      await wrapper.get('.mode-tabs button:nth-child(3)').trigger('click');
      await flushPromises();
      expect(maskInfo).toHaveBeenCalledWith('MASK-001', 'FAB-A');
      expect(wrapper.text()).toContain('마스크 위치정보');
      expect(wrapper.find('.mask-location-dialog__title').exists()).toBe(true);
      expect(wrapper.getComponent(MaskLocationDialog).props('lotId')).toBe('WP-COMMENT');
      expect(wrapper.getComponent(MaskLocationDialog).props('maskTag')).toBe('MASK-001');
      await wrapper.get('.equipment-input input').setValue('EQP-OLD');
      await wrapper.get('.mask-location-dialog .dialog-ok-button').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.getComponent(MaskLocationDialog).props('maskTag')).toBe('MASK-002');
      expect(wrapper.get<HTMLInputElement>('.equipment-input input').element.value).toBe('');
      await wrapper.get('.mask-location-dialog .dialog-ok-button').trigger('click');
      expect(wrapper.find('.mask-location-dialog').exists()).toBe(false);
      await wrapper.get('.ds-screen__actions button.primary').trigger('click');
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('ROOT LOTNAME : ROOT-WP00001');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      await wrapper.get('.ds-screen__actions button:nth-child(2)').trigger('click');
      await flushPromises();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('EQP-A');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('RCP-A');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('OK');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      await wrapper.get('.ds-screen__actions button:nth-child(3)').trigger('click');
      await flushPromises();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('공정을 선택해야 합니다.');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      processGrid().vm.$emit('processTap', processGrid().props('rows')[0]);
      await wrapper.get('.ds-screen__actions button:nth-child(3)').trigger('click');
      await flushPromises();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('FUTURE HOLD');
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
      expect(processGrid().props('rows')).toHaveLength(20);

      processGrid().vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      expect(processGrid().props('selectedProcessId')).toBe('P00002:00:1');

      processGrid().vm.$emit('select', 'P00001:00:0');
      await wrapper.vm.$nextTick();
      processGrid().vm.$emit('openMenu', 'P00001:00:0');
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[role="dialog"]').text()).toContain('COMMENT');
      expect(wrapper.getComponent({ name: 'DrawMenuList' }).props('row')).toMatchObject({
        COMMENTCNT: '0',
        ISCURRENT: 'Y',
        OPERATION: 'P00001',
      });
      await wrapper.get('[data-action-id="move-in"]').trigger('click');
      await flushPromises();
      expect(wrapper.get('.draw-menu-list').attributes('aria-hidden')).toBe('true');
      expect(router.currentRoute.value.path).toBe('/move-in/WP-COMMENT');
      await router.push('/esheet?lotId=WP-COMMENT');
      await flushPromises();
      processGrid().vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      processGrid().vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      const commentAction = wrapper.get('[data-action-id="comment"]');
      expect(commentAction.attributes('disabled')).toBeUndefined();
      await commentAction.trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/comment-list');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'WP-COMMENT',
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
        LOTID: 'WP-COMMENT',
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
    await router.push('/esheet?lotId=WP-COMMENT');
    await router.isReady();

    const wrapper = mount(ESheetPage, { global: { plugins: [pinia, router] } });
    try {
      await flushPromises();
      wrapper.getComponent(ESheetProcessGrid).vm.$emit('select', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')[1].commentCount).toBe('1');
      wrapper.getComponent(ESheetProcessGrid).vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      expect(wrapper.getComponent({ name: 'DrawMenuList' }).props('row')).toMatchObject({
        COMMENTCNT: '1',
        OPERATION: 'P00002',
      });
      await wrapper.get('[data-action-id="setting-een"]').trigger('click');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/een-setting');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'WP-COMMENT',
        factoryName: 'GUMI',
        product: 'P-DM-TEST-6F',
        route: 'PHOTO-DEMO',
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
        ROUTE: 'PHOTO-DEMO',
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
        { path: '/remote-furnace-kec', component: { template: '<div />' } },
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
      expect(router.currentRoute.value.path).toBe('/remote-furnace-kec');
      expect(router.currentRoute.value.query).toEqual({ LOTID: 'WP00001' });
    } finally {
      wrapper.unmount();
    }
  });

  it('routes other Furnace classifications to the standard Furnace screen', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const api = createRemoteFurnaceKjMockApi('classification-other');
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

  it('shows the legacy error dialog when KJ navigation fails', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setRemoteFurnaceKjApi(createRemoteFurnaceKjMockApi());
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
      vi.spyOn(router, 'push').mockRejectedValueOnce(new Error('Navigation failed'));

      const processGrid = wrapper.getComponent(ESheetProcessGrid);
      processGrid.vm.$emit('openMenu', 'P00002:00:1');
      await wrapper.vm.$nextTick();
      await wrapper.get('[data-action-id="furnace-auto"]').trigger('click');
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.text()).toContain('Navigation failed');
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
    const fixture = JSON.parse(getESheetPageFixture('WP00001').result) as {
      MSGBODY: Record<string, unknown>;
    };
    vi.spyOn(esheetService, 'getESheetInfo').mockResolvedValueOnce({
      statusCode: 200,
      result: JSON.stringify({ ...fixture, MSGBODY: { ...fixture.MSGBODY, ESHEETITEMS: [] } }),
    });
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
      expect(wrapper.get<HTMLInputElement>('input[aria-label="ENGR"]').element.value).toBe('PHOTO');
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the tapped F operation across LOT lookups, as Android does', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const futureActions = vi
      .spyOn(esheetActions, 'fetchESheetFutureActions')
      .mockResolvedValue({ ok: true, data: 'FUTURE HOLD' });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/esheet', component: ESheetPage }],
    });
    await router.push('/esheet?lotId=WP00001');
    await router.isReady();

    const wrapper = mount(ESheetPage, {
      attachTo: document.body,
      global: { plugins: [pinia, router], stubs: { BaseModal: ErrorDialogStub } },
    });
    const clickFuture = async () => {
      await wrapper.get('.ds-screen__actions button:nth-child(3)').trigger('click');
      await flushPromises();
    };
    const closeNotice = async () => {
      await wrapper.get('.esheet-notice-dialog button').trigger('click');
      await wrapper.vm.$nextTick();
    };
    try {
      await flushPromises();
      const grid = wrapper.getComponent(ESheetProcessGrid);
      grid.vm.$emit('select', 'P00002:00:1');
      await clickFuture();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('공정을 선택해야 합니다.');
      await closeNotice();
      expect(futureActions).not.toHaveBeenCalled();

      grid.vm.$emit('processTap', grid.props('rows')[1]);
      await clickFuture();
      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('FUTURE HOLD');
      await closeNotice();
      expect(futureActions).toHaveBeenLastCalledWith('WP00001', 'P00002', '00');

      await wrapper.get<HTMLInputElement>('input[aria-label="LOT"]').setValue('WP-COMMENT');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();
      await clickFuture();

      expect(wrapper.get('.esheet-notice-dialog').text()).toContain('FUTURE HOLD');
      expect(futureActions).toHaveBeenLastCalledWith('WP-COMMENT', 'P00002', '00');
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
      await lotInput.setValue('missing-lot');
      await wrapper.get('button[aria-label="LOT 조회"]').trigger('click');
      await flushPromises();

      const dialog = wrapper.getComponent(ErrorDialogStub);
      expect(dialog.props('open')).toBe(true);
      expect(dialog.props('title')).toBe('에  러');
      expect(dialog.text()).toContain('LOT MISSING-LOT을(를) 찾을 수 없습니다.');
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
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toHaveLength(20);
      expect(wrapper.getComponent(ErrorDialogStub).props('open')).toBe(false);
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
      expect(wrapper.getComponent(ESheetProcessGrid).props('rows')).toHaveLength(20);
      expect(wrapper.getComponent(ErrorDialogStub).props('open')).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
