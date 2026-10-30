import { describe, expect, it } from 'vitest';

import { useWaferSelectAit } from '~/features/waferselect-ait/composables/use-waferselect-ait';

const input = {
  SEQUENCE: ' SEQ ',
  LOTID: 'ait240901-001',
  FIXEDCOUNT: 2,
  CATEGORY: 'ETC',
  EXISTWAFERLIST: 'WAFER.03,WAFER.01,WAFER.25',
};

describe('AIT selection parity', () => {
  it.each(['abc', '1.5', ' 2', '2 ', '2147483648', '-2147483649'])(
    'rejects malformed or out-of-range FIXEDCOUNT %s before building slots',
    (FIXEDCOUNT) => {
      expect(() => useWaferSelectAit({ ...input, FIXEDCOUNT })).toThrow();
    },
  );

  it.each(['', '+2', '-1', '2147483647', '-2147483648'])(
    'accepts empty or signed 32-bit FIXEDCOUNT %s',
    (FIXEDCOUNT) => {
      expect(() => useWaferSelectAit({ ...input, FIXEDCOUNT })).not.toThrow();
    },
  );

  it('waits for acknowledgement before continuing each overflowing preselection', () => {
    const state = useWaferSelectAit({
      ...input,
      FIXEDCOUNT: 1,
      SELECTWAFERLIST: 'WAFER.01,WAFER.03,WAFER.25',
    });
    expect(state.selectedWaferList.value).toBe('WAFER.01');
    expect(state.error.value).not.toBe('');
    state.error.value = '';
    state.continuePreselection();
    expect(state.error.value).not.toBe('');
    state.error.value = '';
    state.continuePreselection();
    expect(state.error.value).toBe('');
    expect(state.selectedWaferList.value).toBe('WAFER.01');
  });

  it('maps two-digit suffixes to 25 slots, leaving absent slots blank and disabled', () => {
    const state = useWaferSelectAit(input);
    expect(state.slots.value).toHaveLength(25);
    expect(state.slots.value[0]).toMatchObject({
      waferName: 'WAFER.01',
      slotNo: '01',
      disabled: false,
    });
    expect(state.slots.value[1]).toMatchObject({ waferName: '', slotNo: '02', disabled: true });
    expect(state.slots.value[24]?.waferName).toBe('WAFER.25');
    expect(state.lotNo.value).toBe('AIT240901-001');
    state.lotNo.value = 'abc';
    expect(state.lotNo.value).toBe('ABC');
  });

  it('does not normalize wafer suffixes or whitespace', () => {
    const state = useWaferSelectAit({ ...input, EXISTWAFERLIST: 'W.1,W.02 ,W.03' });
    expect(
      state.slots.value.filter((slot) => !slot.disabled).map((slot) => slot.waferName),
    ).toEqual(['W.03']);
  });

  it.each([{ CATEGORY: 'COUNT' }, { EXISTWAFERLIST: '' }])(
    'does not build a grid for %o',
    (extra) => {
      expect(useWaferSelectAit({ ...input, ...extra }).slots.value).toEqual([]);
    },
  );

  it('limits selection, allows deselection and sorts full names in the result', () => {
    const state = useWaferSelectAit(input);
    state.toggleWafer(24);
    state.toggleWafer(0);
    state.toggleWafer(2);
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.25');
    expect(state.error.value).toBe('선택한 WAFER개수가 지정된 개수를 초과하였습니다.');
    state.toggleWafer(24);
    state.toggleWafer(2);
    expect(state.sendWaferList()).toEqual({
      SEQUENCE: ' SEQ ',
      SELECTEDWAFERLIST: 'WAFER.01,WAFER.03',
      SELECTEDMACHINE: '',
    });
  });

  it('zero or missing fixed count prevents selecting but allows empty confirmation', () => {
    const state = useWaferSelectAit({ EXISTWAFERLIST: 'W.01' });
    state.toggleWafer(0);
    expect(state.selectedWaferList.value).toBe('');
    expect(state.error.value).not.toBe('');
    expect(state.sendWaferList().SELECTEDWAFERLIST).toBe('');
    expect(state.sendWaferList().SEQUENCE).toBe('null');
    expect(useWaferSelectAit({ SEQUENCE: '' }).sendWaferList().SEQUENCE).toBe('');
  });

  it('uses substring membership and restores disabled preselection through performClick', () => {
    const state = useWaferSelectAit({
      ...input,
      SELECTWAFERLIST: 'XWAFER.01X,WAFER.03',
      DISABLEWAFERLIST: 'XWAFER.03X',
    });
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.03');
    state.toggleWafer(2);
    state.toggleWafer(1);
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.03');
    state.resetWafer();
    expect(state.selectedWaferList.value).toBe('WAFER.03');
    state.toggleWafer(24);
    expect(state.selectedWaferList.value).toBe('WAFER.03,WAFER.25');
    state.selectAll();
    expect(state.selectedWaferList.value).toBe('WAFER.03');
    state.selectAll();
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.03');
  });

  it('counts disabled preselection against limits for enabled and preselected wafers', () => {
    const state = useWaferSelectAit({
      ...input,
      FIXEDCOUNT: 1,
      SELECTWAFERLIST: 'WAFER.01,WAFER.03',
      DISABLEWAFERLIST: 'WAFER.01',
    });
    expect(state.selectedWaferList.value).toBe('WAFER.01');
    expect(state.error.value).not.toBe('');
    state.error.value = '';
    state.toggleWafer(24);
    expect(state.error.value).not.toBe('');
    state.resetWafer();
    expect(state.selectedWaferList.value).toBe('WAFER.01');
  });

  it('applies preselection through the fixed-count limit in slot order', () => {
    const state = useWaferSelectAit({
      ...input,
      FIXEDCOUNT: 1,
      SELECTWAFERLIST: 'WAFER.03,WAFER.01',
    });
    expect(state.selectedWaferList.value).toBe('WAFER.01');
    expect(state.error.value).not.toBe('');
  });

  it('select-all fills remaining slots then clears enabled selections when count is reached', () => {
    const state = useWaferSelectAit(input);
    state.toggleWafer(24);
    state.selectAll();
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.25');
    state.selectAll();
    expect(state.selectedWaferList.value).toBe('');
  });

  it('does not toggle off when all available wafers are selected below the fixed count', () => {
    const state = useWaferSelectAit({ ...input, FIXEDCOUNT: 5, DISABLEWAFERLIST: 'WAFER.03' });
    state.selectAll();
    state.selectAll();
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.25');
    state.resetWafer();
    expect(state.selectedWaferList.value).toBe('');
  });

  it('view-only selects existing wafers without a limit and ignores all edits', () => {
    const state = useWaferSelectAit({
      ...input,
      EDITABLE: 'N',
      FIXEDCOUNT: 0,
      DISABLEWAFERLIST: 'WAFER.01',
    });
    expect(state.editable).toBe(false);
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.03,WAFER.25');
    state.toggleWafer(0);
    state.selectAll();
    state.resetWafer();
    expect(state.selectedWaferList.value).toBe('WAFER.01,WAFER.03,WAFER.25');
  });
});
