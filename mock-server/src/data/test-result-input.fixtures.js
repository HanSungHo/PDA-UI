const base = {
  SERIALNO: '001234',
  PELLICLE: 'Y',
  TODATE: '2026-10-27',
  FABINDATE: '2026-10-01',
  EQPIDS: { EQPID: [{ ITEM1: 'EQP01' }, { ITEM1: 'EQP02' }] },
  INSPTYPES: { INSPTYPE: [{ ITEM1: '입고 검사' }, { ITEM1: '정기 검사' }] },
  INSPRESULTS: { INSPRESULT: [{ ITEM1: '사용가능' }, { ITEM1: '사용불가' }] },
  INSPTYPE2S: { INSPTYPE2: [{ ITEM1: 'VISUAL' }, { ITEM1: 'FUNCTION' }] },
};

export const testResultInputFixtures = {
  MASK01: base,
  MASKSHORT: { ...base, SERIALNO: '123' },
  MASKLONG: { ...base, SERIALNO: '0012345678' },
  MASKNOFAB: { ...base, FABINDATE: '' },
  MASKEMPTY: {
    ...base,
    EQPIDS: { EQPID: [] },
    INSPTYPES: { INSPTYPE: [] },
    INSPRESULTS: { INSPRESULT: [] },
    INSPTYPE2S: { INSPTYPE2: [] },
  },
  MASKRUN: base,
  MASKRUNALLOWED: base,
  MASKCHECKFAIL: base,
  MASKINSERTFAIL: base,
};
