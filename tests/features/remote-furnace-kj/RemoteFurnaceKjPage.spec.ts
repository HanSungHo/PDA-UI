import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { QDialog } from 'quasar';
import { BaseDropdownList, BaseModal, BaseRevoGrid } from 'src/components/base';
import {
  createRemoteFurnaceKjMockApi,
  resetRemoteFurnaceKjApi,
  setRemoteFurnaceKjApi,
  useRemoteFurnaceKjStore,
} from 'src/features/remote-furnace-kj';
import RemoteFurnaceKjPage from 'src/features/remote-furnace-kj/pages/RemoteFurnaceKjPage.vue';
import { RemoteRecipeDialog } from 'src/features/remote-ramco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

describe('RemoteFurnaceKjPage', () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => resetRemoteFurnaceKjApi());

  function mountPage(
    initialLotId = 'LOT-KJ-001',
    extraQuery: Record<string, string> = {},
    useRealQDialog = false,
  ) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/remote-furnace-kj', component: RemoteFurnaceKjPage },
        { path: '/comment-list', component: { template: '<main>Comment List</main>' } },
        { path: '/esheet', component: { template: '<main>eSheet</main>' } },
      ],
    });
    const query = new URLSearchParams({ lotId: initialLotId, ...extraQuery });
    return router.push(`/remote-furnace-kj?${query}`).then(async () => {
      await router.isReady();
      const wrapper = mount(RemoteFurnaceKjPage, {
        attachTo: document.body,
        props: { initialLotId },
        global: {
          plugins: [router],
          stubs: { BaseRevoGrid, ...(useRealQDialog ? { QDialog } : {}) },
        },
      });
      await flushPromises();
      return { wrapper, router };
    });
  }

  it('renders the supplied KJ design structure with legacy Korean screen copy and LOT values', async () => {
    const { wrapper } = await mountPage();
    try {
      expect(wrapper.get('h1').text()).toBe('KJ Furnace 자동화');
      expect(wrapper.find('.remote-furnace-kj-header').element.children).toHaveLength(1);
      expect(wrapper.find('[aria-label="뒤로가기"]').exists()).toBe(false);
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-lot').element.value).toBe(
        'LOT-KJ-001',
      );
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-batch').element.value).toBe(
        'BATCH-KJ-01',
      );
      expect(
        wrapper.findAll('.remote-furnace-kj-lot-row .ds-field__label').map((label) => label.text()),
      ).toEqual(['LOT', 'Batch']);
      expect(wrapper.text()).toContain('RECIPE');
      expect(wrapper.text()).toContain('진행 Rcp');
      expect(wrapper.text()).not.toContain('진행 RCP');
      expect(wrapper.text()).toContain('기준장비');
      expect(wrapper.text()).toContain('진행장비');
      expect(wrapper.text()).toContain('PORT');
      expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(true);
      expect(wrapper.findAll('.remote-furnace-kj-machine-row input')).toHaveLength(1);
      expect(wrapper.text()).toContain('취소');
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps the no-LOT footer labels and does not render batch rows', async () => {
    const { wrapper } = await mountPage('');
    try {
      expect(wrapper.text()).toContain('NO BATCH');
      expect(wrapper.text()).toContain('온도설정');
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-lot').element.placeholder).toBe(
        'LOT No',
      );
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-batch').element.placeholder).toBe(
        'BAT ID',
      );
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-recipe').element.placeholder).toBe(
        '',
      );
      expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(false);
      expect(wrapper.find('.remote-furnace-kj-empty').exists()).toBe(true);
      expect(document.activeElement).toBe(wrapper.get('#remote-furnace-kj-equipment').element);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps KJ fields without Android hints visually blank', async () => {
    const { wrapper } = await mountPage('LOT-KJ-001', { mockCase: 'external-machine' });
    try {
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-recipe').element.placeholder).toBe(
        '',
      );
      expect(
        wrapper.get<HTMLInputElement>('#remote-furnace-kj-standard-machine').element.placeholder,
      ).toBe('');
      expect(
        wrapper
          .findAll('.remote-furnace-kj-machine-row input')
          .map((input) => input.element.placeholder),
      ).toEqual(['', '']);

      const dropdowns = wrapper.findAllComponents(BaseDropdownList);
      expect(dropdowns.map((dropdown) => dropdown.props('placeholder'))).toEqual([
        undefined,
        undefined,
      ]);
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-lot').element.placeholder).toBe(
        'LOT No',
      );
      expect(wrapper.get<HTMLInputElement>('#remote-furnace-kj-batch').element.placeholder).toBe(
        'BAT ID',
      );
    } finally {
      wrapper.unmount();
    }
  });
  it('maps Android batch statuses to FAIL, RUN, and default row classes', async () => {
    const { wrapper } = await mountPage('LOT-KJ-001', { mockCase: 'row-statuses' });
    try {
      const rows = wrapper.findComponent(BaseRevoGrid).props('rows') as Array<{
        LOTID: string;
        rowClass: string;
      }>;
      expect(rows.map(({ LOTID, rowClass }) => [LOTID, rowClass])).toEqual([
        ['LOT-KJ-FAIL', 'is-fail'],
        ['LOT-KJ-RUN', 'is-run'],
        ['LOT-KJ-WAIT', ''],
      ]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows a changed standard machine value with the BaseInput error text tone', async () => {
    const { wrapper } = await mountPage('LOT-KJ-001', { mockCase: 'machine-changed' });
    try {
      expect(
        wrapper.get<HTMLInputElement>('#remote-furnace-kj-standard-machine').element.value,
      ).toBe('KJ-02');
      expect(
        wrapper
          .get('#remote-furnace-kj-standard-machine')
          .element.closest('.ds-input')
          ?.classList.contains('ds-input--tone-error-text'),
      ).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('does not render demo annotation controls on the release screen', async () => {
    const { wrapper } = await mountPage('LOT-KJ-001', { demo: '1' });
    try {
      expect(wrapper.find('[data-demo-annotation-toggle]').exists()).toBe(false);
      expect(wrapper.find('[data-demo-annotation]').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('validates equipment on Enter, loads equipment, and selects a recipe and port', async () => {
    const { wrapper } = await mountPage();
    try {
      const equipmentInput = wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment');
      await equipmentInput.setValue('EQP-KJ-011');
      expect(wrapper.find('#remote-furnace-kj-standard-machine').exists()).toBe(true);
      await equipmentInput.trigger('keydown.enter');
      await flushPromises();

      expect(equipmentInput.element.value).toBe('KJ-01');
      expect(document.activeElement).toBe(equipmentInput.element);
      expect(equipmentInput.element.selectionStart).toBe(0);
      expect(equipmentInput.element.selectionEnd).toBe('KJ-01'.length);
      const dropdowns = wrapper.findAllComponents(BaseDropdownList);
      expect(dropdowns[0]?.props('modelValue')).toBe('RCP-KJ-01');
      expect(dropdowns[0]?.props('options')).toEqual([{ label: 'RCP-KJ-01', value: 'RCP-KJ-01' }]);
      expect(dropdowns[1]?.props('modelValue')).toBe('1');
      expect(dropdowns[1]?.props('options')).toEqual([
        { label: '1', value: '1' },
        { label: '2', value: '2' },
      ]);
      expect(wrapper.get('[aria-label="PORT 상태"]').text()).toBe('IDLE');
    } finally {
      wrapper.unmount();
    }
  });

  it('opens Comment List with legacy row context and the KJ-only mock flag', async () => {
    const { wrapper, router } = await mountPage();
    try {
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').setValue('EQP-KJ-011');
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').trigger('keydown.enter');
      await flushPromises();
      const grid = wrapper.findComponent(BaseRevoGrid);
      expect(grid.exists()).toBe(true);
      grid.vm.$emit('rowSelect', 'LOT-KJ-001', {
        LOTID: 'LOT-KJ-001',
        COMMENTQTY: '1',
        OPERATION: 'FURNACE',
        SUBOPERATION: 'KJ',
        PROCESSSTEP: 'REMOTE FURNACE KJ',
        OPERSEQUENCE: '0042',
        NWCOMMENTQTY: '1',
      });
      await flushPromises();
      expect(grid.props('selectedRowKey')).toBe('LOT-KJ-001');
      expect(router.currentRoute.value.path).toBe('/remote-furnace-kj');

      await grid.trigger('pointerup');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/comment-list');
      expect(router.currentRoute.value.query).toMatchObject({
        lotId: 'LOT-KJ-001',
        operation: 'FURNACE',
        subOperation: 'KJ',
        processStep: 'REMOTE FURNACE KJ',
        operSequence: '0042',
        mock: 'remote-furnace-kj',
      });
      expect(useRemoteFurnaceKjStore().draft).toMatchObject({
        lotId: 'LOT-KJ-001',
        equipmentInput: 'KJ-01',
        selectedRecipe: 'RCP-KJ-01',
      });
    } finally {
      wrapper.unmount();
    }
  });

  it('does not add the Comment List fixture selector outside development', async () => {
    vi.stubEnv('DEV', false);
    const { wrapper, router } = await mountPage();
    try {
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').setValue('EQP-KJ-011');
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').trigger('keydown.enter');
      await flushPromises();
      const grid = wrapper.findComponent(BaseRevoGrid);
      grid.vm.$emit('rowSelect', 'LOT-KJ-001', {
        LOTID: 'LOT-KJ-001',
        COMMENTQTY: '1',
        OPERATION: 'FURNACE',
        SUBOPERATION: 'KJ',
        PROCESSSTEP: 'REMOTE FURNACE KJ',
        OPERSEQUENCE: '0042',
      });
      await grid.trigger('pointerup');
      await flushPromises();

      expect(router.currentRoute.value.path).toBe('/comment-list');
      expect(router.currentRoute.value.query).not.toHaveProperty('mock');
    } finally {
      vi.unstubAllEnvs();
      wrapper.unmount();
    }
  });

  it('does not navigate on keyboard focus alone and supports explicit grid activation', async () => {
    const { wrapper, router } = await mountPage();
    try {
      const grid = wrapper.findComponent(BaseRevoGrid);
      grid.vm.$emit('rowSelect', 'LOT-KJ-001', {
        LOTID: 'LOT-KJ-001',
        COMMENTQTY: '1',
        OPERATION: 'FURNACE',
        SUBOPERATION: 'KJ',
        PROCESSSTEP: 'REMOTE FURNACE KJ',
        OPERSEQUENCE: '0042',
      });
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/remote-furnace-kj');

      await grid.trigger('keydown.enter');
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/comment-list');
    } finally {
      wrapper.unmount();
    }
  });

  it('shows recipe confirmation before command and closes without submitting on cancel', async () => {
    const { wrapper } = await mountPage();
    try {
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').setValue('EQP-KJ-011');
      await wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment').trigger('keydown.enter');
      await flushPromises();

      await wrapper.get('[data-action="start"]').trigger('click');
      const dialog = wrapper.findComponent(RemoteRecipeDialog);
      expect(dialog.props('modelValue')).toBe(true);
      expect(dialog.props('recipeList')).toBe('RCP-KJ-01');

      dialog.vm.$emit('cancel');
      await flushPromises();
      expect(wrapper.findComponent(RemoteRecipeDialog).props('modelValue')).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });

  it('closes each equipment notice before opening the next notice', async () => {
    const api = createRemoteFurnaceKjMockApi('equipment-notices');
    const fetchEquipmentInfo = vi.spyOn(api, 'fetchEquipmentInfo');
    setRemoteFurnaceKjApi(api);
    const { wrapper } = await mountPage('LOT-KJ-001', {}, true);
    try {
      const equipmentInput = wrapper.get<HTMLInputElement>('#remote-furnace-kj-equipment');
      await equipmentInput.setValue('EQP-KJ-011');
      await equipmentInput.trigger('keydown.enter');
      await flushPromises();
      expect(fetchEquipmentInfo).toHaveBeenCalledTimes(1);
      expect(equipmentInput.element.value).toBe('KJ-01');

      const expectedNotices = [
        { title: 'PM주기 경고', message: 'PM notice' },
        { title: '계측 주기 알림', message: 'Cycle one' },
        { title: '계측 주기 알림', message: 'Cycle two' },
      ];
      const findMessageModal = (title: string) =>
        wrapper
          .findAllComponents(BaseModal)
          .find((candidate) => candidate.props('title') === title);

      for (let index = 0; index < expectedNotices.length; index += 1) {
        const modal = findMessageModal(expectedNotices[index]?.title ?? '');
        expect(modal).toBeDefined();
        expect(modal?.props('open')).toBe(true);
        expect(modal?.props('title')).toBe(expectedNotices[index]?.title);
        expect(document.body.textContent).toContain(expectedNotices[index]?.message);

        const confirmButton = Array.from(
          document.body.querySelectorAll<HTMLButtonElement>(
            '.remote-furnace-kj-message-modal button',
          ),
        ).find((button) => button.textContent?.trim() === '확인');
        expect(confirmButton).toBeDefined();
        confirmButton?.click();
        await flushPromises();

        expect(modal?.props('open')).toBe(false);
        if (index < expectedNotices.length - 1) {
          expect(modal?.props('title')).toBe(expectedNotices[index]?.title);
        }

        if (index < expectedNotices.length - 1) {
          await vi.waitFor(async () => {
            await flushPromises();
            const nextModal = findMessageModal(expectedNotices[index + 1]?.title ?? '');
            expect(nextModal?.props('open')).toBe(true);
            expect(document.body.textContent).toContain(expectedNotices[index + 1]?.message);
          });
        } else {
          await flushPromises();
        }
      }

      expect(
        wrapper
          .findAllComponents(BaseModal)
          .some(
            (candidate) =>
              candidate.props('overlayClosable') === true && candidate.props('open') === true,
          ),
      ).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
});
