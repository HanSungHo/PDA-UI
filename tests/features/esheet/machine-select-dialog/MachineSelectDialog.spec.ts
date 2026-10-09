import { flushPromises, mount } from '@vue/test-utils';
import type { MachineSelectParams } from 'src/features/machine-select-dialog';
import { MachineSelectDialog } from 'src/features/machine-select-dialog';
import {
  fetchMachineSelectRealEqp,
  fetchMachineSelectRecipeInfo,
} from 'src/features/machine-select-dialog/services/machine-select-dialog.service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/features/machine-select-dialog/services/machine-select-dialog.service', () => ({
  fetchMachineSelectRealEqp: vi.fn(),
  fetchMachineSelectRecipeInfo: vi.fn(),
}));

const baseParams: MachineSelectParams = {
  identCodeList: '',
  isExposure: 'N',
  eqpGroup: 'EQP-01',
  expEqpGroup: '',
  operation: 'OPER',
  subOperation: '010',
  product: 'PRODUCT-A',
  lotId: 'LOT-A260915-018',
  facility: 'KFAB',
};

function mountDialog(params: Partial<MachineSelectParams> = {}) {
  return mount(MachineSelectDialog, {
    attachTo: document.body,
    props: {
      params: {
        ...baseParams,
        ...params,
      },
    },
  });
}

function getField(index: number): HTMLInputElement {
  const field = document.body.querySelectorAll<HTMLInputElement>('.machine-select-field input')[
    index
  ];
  if (!field) throw new Error(`Missing machine select field ${index}`);
  return field;
}

async function enterMachine(index: number, value: string) {
  const field = getField(index);
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
  field.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  await flushPromises();
}

async function clickButton(selector: string) {
  const button = document.body.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing button ${selector}`);
  button.click();
  await flushPromises();
}

describe('MachineSelectDialog', () => {
  beforeEach(() => {
    vi.mocked(fetchMachineSelectRealEqp).mockImplementation(async ({ eqpId }) => ({
      ok: true,
      eqpId,
    }));
    vi.mocked(fetchMachineSelectRecipeInfo).mockImplementation(async ({ eqpId, subOperation }) => ({
      ok: true,
      recipe: `${eqpId}-${subOperation}-RCP`,
    }));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.resetAllMocks();
  });

  it('resolves a normal machine and emits the selected equipment, group, and recipe', async () => {
    const wrapper = mountDialog();

    try {
      expect(document.body.textContent).toContain('장비선택');
      expect(document.body.textContent).toContain('시작장비');
      expect(document.body.textContent).toContain('기준장비');
      expect(document.body.textContent).toContain('선택장비');
      expect(document.body.textContent).toContain('RECIPE');
      expect(getField(0).value).toBe('EQP-01');
      expect(getField(1).placeholder).toBe('');
      expect(getField(2).value).toBe('');

      await enterMachine(1, 'eqp-EQP-01X');
      await clickButton('.machine-select-ok');

      expect(fetchMachineSelectRealEqp).toHaveBeenCalledWith({
        facility: 'KFAB',
        eqpId: 'EQP-01',
      });
      expect(fetchMachineSelectRecipeInfo).toHaveBeenCalledWith({
        lotId: 'LOT-A260915-018',
        operation: 'OPER',
        subOperation: '010',
        product: 'PRODUCT-A',
        eqpId: 'EQP-01',
        facility: 'KFAB',
      });
      expect(wrapper.emitted('confirm')?.[0]).toEqual([
        {
          EQPGROUP: 'EQP-01',
          EQPID: 'EQP-01',
          RECIPE: 'EQP-01-010-RCP',
        },
      ]);
    } finally {
      wrapper.unmount();
    }
  });

  it('handles exposure equipment and uses sub operation E for exposure recipe', async () => {
    const wrapper = mountDialog({
      identCodeList: 'N',
      isExposure: 'Y',
      eqpGroup: 'EQP-START',
      expEqpGroup: 'EQP-EXP',
    });

    try {
      expect(document.body.textContent).toContain('노광장비');

      await enterMachine(1, 'EQP-EQP-STARTX');
      await enterMachine(4, 'EQP-EQP-EXPX');
      await clickButton('.machine-select-ok');

      expect(fetchMachineSelectRecipeInfo).toHaveBeenCalledWith(
        expect.objectContaining({ eqpId: 'EQP-START', subOperation: '010' }),
      );
      expect(fetchMachineSelectRecipeInfo).toHaveBeenCalledWith(
        expect.objectContaining({ eqpId: 'EQP-EXP', subOperation: 'E' }),
      );
      expect(wrapper.emitted('confirm')?.[0]).toEqual([
        {
          EQPGROUP: 'EQP-START|EQP-EXP',
          EQPID: 'EQP-START|EQP-EXP',
          RECIPE: 'EQP-START-010-RCP|EQP-EXP-E-RCP',
        },
      ]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the legacy validation message when OK is pressed without a resolved machine', async () => {
    const wrapper = mountDialog();

    try {
      await clickButton('.machine-select-ok');

      expect(document.body.textContent).toContain('장비를 입력하세요.');
      expect(wrapper.emitted('confirm')).toBeUndefined();
    } finally {
      wrapper.unmount();
    }
  });

  it('shows and closes the error popup when barcode equipment format is invalid', async () => {
    const wrapper = mountDialog();

    try {
      await enterMachine(1, 'ANY-EQP');

      expect(document.body.textContent).toContain('진행할 장비를 읽어주세요.');
      expect(fetchMachineSelectRealEqp).not.toHaveBeenCalled();

      await clickButton('.machine-select-alert-ok');

      expect(document.body.querySelector('.machine-select-alert')).toBeNull();
    } finally {
      wrapper.unmount();
    }
  });

  it('shows the legacy equipment validation message when selected equipment is not in the standard machine list', async () => {
    const wrapper = mountDialog();

    try {
      await enterMachine(1, 'EQP-ANY-EQPX');

      expect(document.body.textContent).toContain('[ANY-EQP]');
      expect(document.body.textContent).toContain('장비가 기준장비에 존재하지 않습니다.');
      expect(fetchMachineSelectRealEqp).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });

  it('accepts equipment ranges using the legacy ValidateCheck equipment rules', async () => {
    const wrapper = mountDialog({
      eqpGroup: 'EQP-01~03',
    });

    try {
      await enterMachine(1, 'EQP-EQP-02X');

      expect(fetchMachineSelectRealEqp).toHaveBeenCalledWith({
        facility: 'KFAB',
        eqpId: 'EQP-02',
      });
    } finally {
      wrapper.unmount();
    }
  });
});
