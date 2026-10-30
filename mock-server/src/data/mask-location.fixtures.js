const base = {
  PRODUCT: 'PROD01',
  STATUS: 'READY',
  ISUSE: '사용가능',
  CURRLOC: 'OLD',
  SUBLOCATION3: 'EQP01',
  CUSTOMER: 'N',
  RMSINSP: 'WAIT',
  RMSID: 'N',
  SHELF: 'SHELF00',
  PELLICLE: 'PELLICLE01',
};
export const maskLocationFixtures = Object.fromEntries(
  Object.entries({
    MASK01: {},
    MASKPM: { PRODUCT: 'PM' },
    MASKPSM: { CUSTOMER: 'Y' },
    MASKRUN: { RMSINSP: 'RUN', RMSID: 'Y' },
    MASKSKIP: { RMSID: 'Y' },
    MASKUNAVAILABLE: { ISUSE: 'N' },
    MASKMULTI: { SERIAL: 'SHARED' },
    MASKMULTI2: { SERIAL: 'SHARED' },
  }).map(([id, fields]) => [id, { ...base, RETICLETAG: id, SERIAL: id, ...fields }]),
);
