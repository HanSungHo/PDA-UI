import type { WaferSelectIntentExtras } from '../stores/wafer-select.store';
import type {
  DummyEqpInfoResponse,
  DummyEqpInputResponse,
  LotLastEventResponse,
} from '../types/wafer-select.types';

export const waferSelectMock = {
  dummyEqpInfo(eqpId: string): DummyEqpInfoResponse {
    return {
      EQPID: eqpId,
    };
  },

  lotLastEventSlot(): LotLastEventResponse {
    return {
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: 'SLOT : 01(EQP01),02(EQP01),06(EQP02)',
    };
  },

  lotLastEventCount(): LotLastEventResponse {
    return {
      CREATECATEGORY: 'COUNT',
      LASTEVENTCOMMENT: 'COUNT:12',
    };
  },

  dummyEqpInput(comment: string): DummyEqpInputResponse {
    return {
      LOTCOMMENT: comment,
      MSG: '',
    };
  },
};

export const waferSelectMocks = {
  /**
   * Happy path
   * 25 wafer
   * max select = 3
   */
  basic(): WaferSelectIntentExtras {
    return {
      SEQUENCE: 'SEQ001',
      FIXEDCOUNT: 3,
      LOTID: 'LOT001',
      CATEGORY: 'SLOT',
      EDITABLE: 'Y',
      AREA: 'ETCH',

      EXISTWAFERLIST: Array.from(
        { length: 25 },
        (_, i) => `LOT001.${String(i + 1).padStart(2, '0')}`,
      ).join(','),

      DISABLEWAFERLIST: '',

      SELECTWAFERLIST: '',
    };
  },

  /**
   * DIFF Area
   * require machine mapping
   */
  diffArea(): WaferSelectIntentExtras {
    return {
      SEQUENCE: 'SEQ002',
      FIXEDCOUNT: 5,
      LOTID: 'LOT002',
      CATEGORY: 'SLOT',
      EDITABLE: 'Y',
      AREA: 'DIFF',

      EXISTWAFERLIST: 'LOT002.01,LOT002.02,LOT002.03,LOT002.04,LOT002.05',

      DISABLEWAFERLIST: 'LOT002.03',

      SELECTWAFERLIST: 'LOT002.01',
    };
  },

  /**
   * readonly mode: WaferAdapter selects every existing wafer when EDITABLE=N.
   */
  readonly(): WaferSelectIntentExtras {
    return {
      SEQUENCE: 'SEQ003',
      FIXEDCOUNT: 5,
      LOTID: 'LOT003',
      CATEGORY: 'SLOT',
      EDITABLE: 'N',
      AREA: 'DIFF',

      EXISTWAFERLIST: 'LOT003.01,LOT003.02,LOT003.03,LOT003.04,LOT003.05',

      DISABLEWAFERLIST: '',

      SELECTWAFERLIST: '',
    };
  },

  /**
   * COUNT mode
   */
  count(): WaferSelectIntentExtras {
    return {
      SEQUENCE: 'SEQ004',
      FIXEDCOUNT: 0,
      LOTID: 'LOT004',
      CATEGORY: 'COUNT',
      EDITABLE: 'Y',
      AREA: 'ETCH',

      EXISTWAFERLIST: '',
      DISABLEWAFERLIST: '',
      SELECTWAFERLIST: '',
    };
  },

  /**
   * all disabled
   */
  disabled(): WaferSelectIntentExtras {
    return {
      SEQUENCE: 'SEQ005',
      FIXEDCOUNT: 10,
      LOTID: 'LOT005',
      CATEGORY: 'SLOT',
      EDITABLE: 'Y',
      AREA: 'ETCH',

      EXISTWAFERLIST: 'LOT005.01,LOT005.02,LOT005.03,LOT005.04,LOT005.05',

      DISABLEWAFERLIST: 'LOT005.01,LOT005.02,LOT005.03,LOT005.04,LOT005.05',

      SELECTWAFERLIST: '',
    };
  },
};
