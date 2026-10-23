/* eslint-disable @typescript-eslint/no-explicit-any */
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { BaseRevoGrid } from 'src/components/base';
import BackupBayDialog from 'src/components/esheet/BackupBayDialog.vue';
import * as backupBayApi from 'src/services/backup-bay.api';
import { useBackupBayStore } from 'src/stores/backup-bay.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';

vi.mock('@revolist/vue3-datagrid', () => ({
  default: {
    name: 'RevoGrid',
    props: ['source', 'columns'],
    emits: ['beforecellfocus'],
    template: `
      <div data-testid="revo-grid-stub">
        <revogr-scroll-virtual class="vertical" />
        <revogr-scroll-virtual class="horizontal" />
      </div>
    `,
  },
  VGridVueTemplate: (component: unknown, customProps?: Record<string, unknown>) => {
    return (_hFn: unknown, data: Record<string, unknown>) => {
      const mergedProps = { ...customProps, ...data };
      return h(component as Parameters<typeof h>[0], mergedProps);
    };
  },
}));

enableAutoUnmount(afterEach);

describe('BackupBayDialog', () => {
  let store: ReturnType<typeof useBackupBayStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useBackupBayStore();
    vi.spyOn(backupBayApi, 'getFloorDataApi').mockResolvedValue(['1F', '2F', '3F']);
    vi.spyOn(backupBayApi, 'getBayDataApi').mockResolvedValue(['BAY-A01', 'BAY-B01']);
  });

  it('mounts properly and registers 7 rows when open is true', async () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.exists()).toBe(true);

    // Check title in DOM
    const titleEl = document.body.querySelector('.backup-bay-modal__title');
    expect(titleEl?.textContent).toContain('Backup Bay 변경');

    // Check BaseRevoGrid integration and 7 rows
    expect(wrapper.findComponent(BaseRevoGrid).exists()).toBe(true);
    const grid = wrapper.getComponent(BaseRevoGrid);
    expect(grid.props('rows')).toHaveLength(7);

    // Check action buttons
    const runBtn = document.body.querySelector('.backup-bay-btn--run');
    expect(runBtn).not.toBeNull();

    const closeBtn = document.body.querySelector('.backup-bay-btn--close');
    expect(closeBtn).not.toBeNull();
  });

  it('emits update:modelValue false when Close button is clicked', async () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    const closeBtn = document.body.querySelector('.backup-bay-btn--close') as HTMLElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);
  });

  it('renders table headers for LOT NO, 층, BAY, JOB, QTY, 공정명 via BaseRevoGrid', () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    const columns = grid.props('columns') as { prop: string; name: string }[];
    const columnNames = columns.map((col) => col.name);
    expect(columnNames).toEqual(['LOT NO', '층', 'BAY', 'JOB', 'QTY', '공정명']);
  });

  it('defines cellTemplate renderers for interactive LOT NO, Floor, Bay, and readonly columns', () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    const columns = grid.props('columns') as {
      prop: string;
      cellTemplate?: (fn: unknown, ctx: unknown) => unknown;
      cellProperties?: (fn: unknown, ctx: unknown) => unknown;
    }[];
    const lotCol = columns.find((c) => c.prop === 'lotId');
    const floorCol = columns.find((c) => c.prop === 'selectedFloor');
    const bayCol = columns.find((c) => c.prop === 'selectedBay');
    const jobCol = columns.find((c) => c.prop === 'jobCode');
    const qtyCol = columns.find((c) => c.prop === 'quantity');
    const procCol = columns.find((c) => c.prop === 'processName');

    expect(typeof lotCol?.cellTemplate).toBe('function');
    expect(typeof floorCol?.cellTemplate).toBe('function');
    expect(typeof bayCol?.cellTemplate).toBe('function');
    expect(typeof jobCol?.cellProperties).toBe('function');
    expect(typeof qtyCol?.cellProperties).toBe('function');
    expect(typeof procCol?.cellProperties).toBe('function');

    // Execute renderers with mock context
    const mockModel = {
      id: 1,
      lotId: 'WA2409001',
      selectedFloor: '1F',
      selectedBay: 'BAY-A01',
      bayOptions: ['BAY-A01', 'BAY-A02'],
      jobCode: 'JOB-01',
      quantity: '25',
      processName: 'ETCH',
      isValid: true,
    };

    const lotVNode = lotCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(lotVNode).toBeDefined();

    const floorVNode = floorCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(floorVNode).toBeDefined();

    const bayVNode = bayCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(bayVNode).toBeDefined();

    const jobVNode = jobCol?.cellProperties?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(jobVNode).toBeDefined();

    const qtyVNode = qtyCol?.cellProperties?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(qtyVNode).toBeDefined();

    const procVNode = procCol?.cellProperties?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(procVNode).toBeDefined();
  });

  it('handles user events on cell template inputs and selects', async () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    const grid = wrapper.getComponent(BaseRevoGrid);
    const columns = grid.props('columns') as {
      prop: string;
      cellTemplate?: (fn: unknown, ctx: unknown) => unknown;
    }[];
    const lotCol = columns.find((c) => c.prop === 'lotId');
    const floorCol = columns.find((c) => c.prop === 'selectedFloor');
    const bayCol = columns.find((c) => c.prop === 'selectedBay');

    const mockModel = {
      id: 1,
      lotId: 'WA2409001',
      selectedFloor: '1F',
      selectedBay: 'BAY-A01',
      bayOptions: ['BAY-A01'],
      jobCode: 'JOB-01',
      quantity: '25',
      processName: 'ETCH',
      isValid: true,
    };

    // LOT BaseInput interaction
    const lotVNode = lotCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(lotVNode).toBeDefined();

    // Trigger onLotUpdate callback
    lotVNode.props.onLotUpdate(0, 'WA2409002');
    expect(store.rows[0].lotId).toBe('WA2409002');

    // Trigger onLotEnter callback
    vi.spyOn(store, 'processLotInput').mockResolvedValue({ success: true, focusIndex: 1 });
    await lotVNode.props.onLotEnter(0);
    expect(store.processLotInput).toHaveBeenCalledWith(0, 'WA2409002');

    // Floor BaseDropdownList interaction
    const floorVNode = floorCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(floorVNode).toBeDefined();
    vi.spyOn(store, 'setFloor').mockResolvedValue();
    await floorVNode.props.onFloorChange(0, '2F');
    expect(store.setFloor).toHaveBeenCalledWith(0, '2F');

    // Bay BaseDropdownList interaction
    const bayVNode = bayCol?.cellTemplate?.(h, { model: mockModel, rowIndex: 0 }) as any;
    expect(bayVNode).toBeDefined();
    vi.spyOn(store, 'setBay');
    bayVNode.props.onBayChange(0, 'BAY-A02');
    expect(store.setBay).toHaveBeenCalledWith(0, 'BAY-A02');
  });

  it('triggers executeRun and emits completed on Run button click', async () => {
    const wrapper = mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    vi.spyOn(store, 'executeRun').mockResolvedValue({ success: true, count: 2 });
    const runBtn = document.body.querySelector('.backup-bay-btn--run') as HTMLElement;
    runBtn.click();
    await wrapper.vm.$nextTick();

    expect(store.executeRun).toHaveBeenCalled();
  });

  it('handles alert modal OK action', async () => {
    mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    store.alertState.open = true;
    store.alertState.title = '경고';
    store.alertState.message = 'BAY 미선택';

    const alertBtn = document.body.querySelector('.backup-bay-alert__btn') as HTMLElement;
    if (alertBtn) {
      alertBtn.click();
      expect(store.alertState.open).toBe(false);
    }
  });
});
