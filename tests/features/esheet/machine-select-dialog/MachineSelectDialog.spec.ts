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
      expect(
        document.body.querySelector('.machine-select-overlay')?.getAttribute('aria-label'),
      ).toBe('장비선택');
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

      expect(document.body.querySelector('.machine-select-alert')?.getAttribute('aria-label')).toBe(
        '에 러',
      );
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

  describe('error and edge flows', () => {
    it('asks for equipment when Enter is pressed on an empty field', async () => {
      const wrapper = mountDialog();

      try {
        await enterMachine(1, '');

        expect(document.body.textContent).toContain('장비를 입력하세요.');
        expect(fetchMachineSelectRealEqp).not.toHaveBeenCalled();
      } finally {
        wrapper.unmount();
      }
    });

    it('emits cancel from the cancel button', async () => {
      const wrapper = mountDialog();

      try {
        await clickButton('.machine-select-cancel');

        expect(wrapper.emitted('cancel')).toHaveLength(1);
      } finally {
        wrapper.unmount();
      }
    });

    it('shows the server message when the real equipment lookup fails', async () => {
      vi.mocked(fetchMachineSelectRealEqp).mockResolvedValue({ ok: false, message: 'no eqp' });
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');

        expect(document.body.textContent).toContain('no eqp');
        expect(fetchMachineSelectRecipeInfo).not.toHaveBeenCalled();
        expect(getField(2).value).toBe('');
      } finally {
        wrapper.unmount();
      }
    });

    it('shows an empty popup when the lookup fails without a message', async () => {
      vi.mocked(fetchMachineSelectRealEqp).mockResolvedValue({ ok: false });
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');

        expect(wrapper.emitted('confirm')).toBeUndefined();
        expect(fetchMachineSelectRecipeInfo).not.toHaveBeenCalled();
      } finally {
        wrapper.unmount();
      }
    });

    it('falls back to the typed equipment and an empty recipe when the responses are sparse', async () => {
      vi.mocked(fetchMachineSelectRealEqp).mockResolvedValue({ ok: true });
      vi.mocked(fetchMachineSelectRecipeInfo).mockResolvedValue({ ok: true });
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');
        await clickButton('.machine-select-ok');

        expect(wrapper.emitted('confirm')?.[0]).toEqual([
          { EQPGROUP: 'EQP-01', EQPID: 'EQP-01', RECIPE: '' },
        ]);
      } finally {
        wrapper.unmount();
      }
    });

    it('shows the recipe lookup error and does not confirm', async () => {
      vi.mocked(fetchMachineSelectRecipeInfo).mockResolvedValue({
        ok: false,
        message: 'no recipe',
      });
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');

        expect(document.body.textContent).toContain('no recipe');
        expect(getField(2).value).toBe('');
      } finally {
        wrapper.unmount();
      }
    });

    it('clears the resolved machine and recipe when the selected machine is edited', async () => {
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');
        expect(getField(2).value).toBe('EQP-01-010-RCP');

        const field = getField(1);
        field.value = 'eqp';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();

        expect(getField(1).value).toBe('EQP');
        expect(getField(2).value).toBe('');

        await clickButton('.machine-select-ok');
        expect(document.body.textContent).toContain('장비를 입력하세요.');
      } finally {
        wrapper.unmount();
      }
    });

    it('resets the form when the params change', async () => {
      const wrapper = mountDialog();

      try {
        await enterMachine(1, 'EQP-EQP-01X');
        await wrapper.setProps({ params: { ...baseParams, eqpGroup: 'EQP-09' } });
        await flushPromises();

        expect(getField(0).value).toBe('EQP-09');
        expect(getField(1).value).toBe('');
        expect(getField(2).value).toBe('');
      } finally {
        wrapper.unmount();
      }
    });

    it('hides the exposure section when the ident code is E', async () => {
      const wrapper = mountDialog({ isExposure: 'Y', identCodeList: 'E', expEqpGroup: 'EQP-EXP' });

      try {
        expect(document.body.textContent).not.toContain('노광장비');
        expect(document.body.querySelectorAll('.machine-select-field')).toHaveLength(3);
      } finally {
        wrapper.unmount();
      }
    });
  });

  describe('exposure flows', () => {
    const exposureParams = {
      identCodeList: 'N',
      isExposure: 'Y',
      eqpGroup: 'EQP-START',
      expEqpGroup: 'EQP-EXP',
    };

    it('requires the start machine before the exposure machine', async () => {
      const wrapper = mountDialog(exposureParams);

      try {
        await clickButton('.machine-select-ok');

        expect(document.body.textContent).toContain('Normal장비를 입력하세요.');
        expect(wrapper.emitted('confirm')).toBeUndefined();
      } finally {
        wrapper.unmount();
      }
    });

    it('requires the exposure machine once the start machine is resolved', async () => {
      const wrapper = mountDialog(exposureParams);

      try {
        await enterMachine(1, 'EQP-EQP-STARTX');
        await clickButton('.machine-select-ok');

        expect(document.body.textContent).toContain('Exposure장비를 입력하세요.');
        expect(wrapper.emitted('confirm')).toBeUndefined();
      } finally {
        wrapper.unmount();
      }
    });

    it('moves to the exposure radio after the start recipe is loaded', async () => {
      const wrapper = mountDialog(exposureParams);

      try {
        expect(getField(1).readOnly).toBe(false);
        expect(getField(4).readOnly).toBe(true);

        await enterMachine(1, 'EQP-EQP-STARTX');

        expect(getField(1).readOnly).toBe(true);
        expect(getField(4).readOnly).toBe(false);
      } finally {
        wrapper.unmount();
      }
    });

    it('selects a section when its radio is clicked', async () => {
      const wrapper = mountDialog(exposureParams);

      try {
        const radios = document.body.querySelectorAll<HTMLElement>(
          '.machine-select-radio .q-radio',
        );
        radios[1]?.click();
        await flushPromises();

        expect(getField(4).readOnly).toBe(false);
        expect(getField(1).readOnly).toBe(true);

        const exposureField = getField(4);
        exposureField.value = 'eqp-exp';
        exposureField.dispatchEvent(new Event('input', { bubbles: true }));
        await flushPromises();

        expect(getField(4).value).toBe('EQP-EXP');
        expect(getField(5).value).toBe('');
      } finally {
        wrapper.unmount();
      }
    });
  });

  describe('legacy equipment validation', () => {
    async function expectLookup(eqpGroup: string, typed: string, allowed: boolean) {
      const wrapper = mountDialog({ eqpGroup });

      try {
        await enterMachine(1, typed);

        if (allowed) {
          expect(fetchMachineSelectRealEqp).toHaveBeenCalledTimes(1);
        } else {
          expect(fetchMachineSelectRealEqp).not.toHaveBeenCalled();
          expect(document.body.textContent).toContain('장비가 기준장비에 존재하지 않습니다.');
        }
      } finally {
        wrapper.unmount();
      }
    }

    it.each([
      ['a standard list without a hyphen', 'NOHYPHEN', 'EQP-ABCD', true],
      ['a machine without a hyphen and an empty list', '', 'EQP-ABCD', false],
      ['a letter inside a letter range', 'EQP-A~C', 'EQP-EQP-BX', true],
      ['a letter outside a letter range', 'EQP-A~C', 'EQP-EQP-DX', false],
      ['a number against a letter range', 'EQP-A~C', 'EQP-EQP-2X', false],
      ['a range without an end', 'EQP-1~', 'EQP-EQP-1X', false],
      ['a number inside a number range', 'EQP-1~5', 'EQP-EQP-3X', true],
      ['a number in a comma list', 'EQP-1,3', 'EQP-EQP-3X', true],
      ['a number missing from a comma list', 'EQP-1,3', 'EQP-EQP-2X', false],
      ['a letter in a comma list', 'EQP-A,C', 'EQP-EQP-CX', true],
      ['a letter missing from a comma list', 'EQP-A,C', 'EQP-EQP-BX', false],
      ['a machine in a later pipe group', 'FOO-1|EQP-4~6', 'EQP-EQP-5X', true],
      ['a prefix that is in no group', 'FOO-1|BAR-2', 'EQP-EQP-1X', false],
      ['a repeated prefix inside one group', '1,2-EQP-3', 'EQP-EQP-3X', true],
    ])('handles %s', async (_name, eqpGroup, typed, allowed) => {
      await expectLookup(eqpGroup, typed, allowed);
    });
  });
});
