import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BackupBayDialog from 'src/components/esheet/BackupBayDialog.vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

enableAutoUnmount(afterEach);

describe('BackupBayDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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

    // Check inputs for 7 rows
    const lotInputs = document.body.querySelectorAll('.backup-bay-input--lot');
    expect(lotInputs.length).toBe(7);

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

  it('renders table headers for Level(층), BAY, JOB, QTY, Process Name via BaseTableCell and BaseTableRow', () => {
    mount(BackupBayDialog, {
      attachTo: document.body,
      props: {
        modelValue: true,
      },
    });

    const tableThead = document.body.querySelector('.backup-bay-table .ant-table-thead');
    expect(tableThead?.textContent).toContain('LOT NO');
    expect(tableThead?.textContent).toContain('층');
    expect(tableThead?.textContent).toContain('BAY');
    expect(tableThead?.textContent).toContain('JOB');
    expect(tableThead?.textContent).toContain('QTY');
    expect(tableThead?.textContent).toContain('Process Name');

    // Check BaseTableCell header cells
    const headerCells = document.body.querySelectorAll('.backup-bay-header-cell');
    expect(headerCells.length).toBeGreaterThanOrEqual(6);
  });
});
