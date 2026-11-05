export const sampleReleaseInfoFixture = {
  SLOTNAME: '',
  SQTY: '5',
  SPROD: 'PROD-SMART-01',
  SOPER: '1000',
  SOPERDESC: 'ETCH INSPECTION',
  SPROCESS: 'MAIN-ROUTE-01',
  RPROD: 'PROD-SMART-01',
  RPROCESS: 'MAIN-ROUTE-01',
  ROPER: '1000',
  RMACHINENAME: 'ETCH-MC-01',
  MLOTNAME: 'MLOT-A26-999',
  MQTY: '20',
  MPROD: 'PROD-SMART-01',
  MPROCESS: 'MAIN-ROUTE-01',
  MOPER: '1000',
  MOPERDESC: 'MAIN ETCH INSPECTION',
  MPROCESSSTATE: 'WAIT',
};

export const lotFixtures = {
  'LOT-DEMO-01': {
    LOTID: 'LOT-DEMO-01',
    PRODUCT: 'PRODUCT-DEMO',
    JOBCODE: 'JOB-01',
    QUANTITY: '25',
    GOODCHIPS: '24',
    WORKEDRECIPE: 'RCP-DEMO',
    WORKEDEQPID: 'EQP-DEMO',
    WORKEDRETICLE: 'MASK-DEMO',
    OPERATION: '1000',
    SUBOPERATION: '00',
    PROCESSSTEP: 'PHOTO',
    NEXTOPERATION: '2000',
    NEXTSUBOPERATION: '00',
    NEXTPROCESSSTEP: 'ETCH',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVOU',
    PROCESSTYPE: 'WT',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: '',
    REMOTECHECK: 'N',
    PCMCHECK: 'Y',
    MVINWAFERCHECK: '',
    CHECKGATEINSPMSG: '',
    BATCHID: '',
    CHILDBATCHID: '',
    MACHINESTATE: '',
    MACHINECODE: '',
    NEXTBAY: 'BAY-A',
    NEXTSTOCKER: 'STK-A',
    ETCMSG: '',
    NWCOMMENTQTY: '1',
    CHECKINTERLOCK: 'Y',
    PHOTOOPERTYPE: 'VI',
    CHECKSKIPWAFER: 'Y',
    WAFERQTY: '25',
    MACHAINQTY: '25',
    TYPEVALUES: [
      { TYPEVALUE: 'REASON-A', typeValue: 'REASON-A' },
      { TYPEVALUE: 'REASON-B', typeValue: 'REASON-B' },
    ],
    CHECKSKIPWAFERMACHINE: 'EQP-DEMO',
    CHECKSKIPWAFERRECIPE: 'RCP-DEMO',
    CREATECATEGORY: '',
    LASTEVENTCOMMENT: '',
    PRODUCTQUANTITY: '25',
    OWNER: '',
    CHECKETCH: 'N',
    BIBUHADOWN: 'N',
    CHAMBERS: '',
    AUTOMOTIVEFLAG: 'N',
  },
  'WET-LOT-01': {
    LOTID: 'WET-LOT-01',
    PRODUCT: 'PRODUCT-WET',
    JOBCODE: 'JOB-WET-01',
    QUANTITY: '24',
    RECIPE: 'RCP-WET-01 (RUN-01)',
    OPERATION: '2100',
    SUBOPERATION: '010',
    PROCESSSTEP: 'WET',
    OPERSEQUENCE: '003',
    OPTYPE: 'WET',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'WET',
    LOTRESUSER: '',
    NWCOMMENTQTY: '1',
  },
  'WET-LOT-02': {
    LOTID: 'WET-LOT-02',
    PRODUCT: 'PRODUCT-WET',
    JOBCODE: 'JOB-WET-02',
    QUANTITY: '18',
    RECIPE: 'RCP-WET-01 (RUN-02)',
    OPERATION: '2200',
    SUBOPERATION: '020',
    PROCESSSTEP: 'WET',
    OPERSEQUENCE: '004',
    OPTYPE: 'WET',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'WET',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },
  'LOT-BATCH-01': {
    LOTID: 'LOT-BATCH-01',
    PRODUCT: 'PRODUCT-BATCH',
    JOBCODE: 'JOB-B01',
    WORKEDRECIPE: 'RCP-BATCH',
    WORKEDEQPID: 'EQP-BATCH',
    WORKEDRETICLE: 'MASK-BATCH',
    OPERATION: '1100',
    PROCESSSTEP: 'DIFF',
    NEXTOPERATION: '1200',
    NEXTPROCESSSTEP: 'ETCH',
    OPERSEQUENCE: '002',
    PROCESSTYPE: 'PCM',
    BATCHID: 'BATCH-DEMO-01',
    NWCOMMENTQTY: '0',
    NEXTBAY: 'BAY-01',
    NEXTSTOCKER: 'STK-01',
    CHECKSKIPWAFERMACHINE: 'EQP-BATCH',
    CHECKSKIPWAFERRECIPE: 'RCP-BATCH',
  },
  'LOT-SKIP-01': {
    LOTID: 'LOT-SKIP-01',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: '',
    CHECKSKIPWAFER: 'N',
    WAFERQTY: '25',
    MACHAINQTY: '20',
  },
  'LOT-HOLD-01': {
    LOTID: 'LOT-HOLD-01',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: 'ONHOLD',
    HOLDCODE: 'ONHOLD',
    HOLD_COMMENT: 'Engineering hold',
    CHECKSKIPWAFER: 'Y',
  },
  'LOT-SPC-HOLD-01': {
    LOTID: 'LOT-SPC-HOLD-01',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: 'ONHOLD',
    HOLDCODE: 'ONHOLD',
    HOLD_COMMENT: 'SPC OUT HOLD',
    SLOTPARTICLE_ITEMS: [
      { SLOT: '01', PARTICLE: '12' },
      { SLOT: '02', PARTICLE: '8' },
    ],
  },
  'LOT-DOWN-01': {
    LOTID: 'LOT-DOWN-01',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: '',
    CHECKSKIPWAFER: 'Y',
    BIBUHADOWN: 'Y',
  },
  'LOT-DIFF-01': {
    LOTID: 'LOT-DIFF-01',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: '',
    CHECKSKIPWAFER: 'Y',
    BATCHID: 'BAT202048248',
    WORKEDEQPID: 'DIFF-01',
  },
  'LOT-MEAS-01': {
    LOTID: 'LOT-MEAS-01',
    PRODUCT: 'PRD-MEAS-100',
    JOBCODE: 'JOB-M01',
    QUANTITY: '25',
    GOODCHIPS: '25',
    RECIPE: 'RCP-MEAS-01',
    CHANGERECIPE: '',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'THICK_MEAS',
    OPERSEQUENCE: '010',
    OPTYPE: 'M',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'DIFF',
    FACILITY: 'FAB1',
    CUSTOMER: 'CUST-KEY',
    CATEGORY: 'MASS',
    ENGINEER: 'KIM_ENG',
    PACKING: 'TRAY',
    OXMACHINE: 'FURN-01',
    COMMENTQTY: '2',
    NWCOMMENTQTY: '0',
    WAFERLIST: '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25',
    MEASEQPID: 'MEQP-01',
    MACHINENAME: '',
    PORTNAME: '',
    MACHINERECIPENAME: '',
    LOTRESUSER: '',
    REWORKINFO: 'N',
    ETCMSG: '',
  },
  'LOT-MEAS-BF': {
    LOTID: 'LOT-MEAS-BF',
    PRODUCT: 'PRD-MEAS-200',
    JOBCODE: 'JOB-M02',
    QUANTITY: '25',
    GOODCHIPS: '24',
    RECIPE: 'RCP-MEAS-BF',
    CHANGERECIPE: '',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'THICK_MEAS',
    OPERSEQUENCE: '010',
    OPTYPE: 'M',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'DIFF',
    FACILITY: 'FAB1',
    CUSTOMER: 'CUST-KEY',
    CATEGORY: 'MASS',
    ENGINEER: 'LEE_ENG',
    PACKING: 'TRAY',
    OXMACHINE: 'FURN-02',
    COMMENTQTY: '0',
    NWCOMMENTQTY: '0',
    WAFERLIST: '1,2,3,4,5',
    MEASEQPID: 'MEQP-BF',
    REWORKINFO: 'N',
  },
  'LOT-MEAS-RUN': {
    LOTID: 'LOT-MEAS-RUN',
    STATUS: 'RUN',
    STATE: 'WIP',
    HOLDSTATUS: '',
    OPTYPE: 'M',
    PROCESSSTEP: 'THICK_MEAS',
  },
  'LOT-MEAS-NONWIP': {
    LOTID: 'LOT-MEAS-NONWIP',
    STATUS: 'WAIT',
    STATE: 'HOLD',
    HOLDSTATUS: '',
    OPTYPE: 'M',
    PROCESSSTEP: 'THICK_MEAS',
  },
  'LOT-MEAS-HOLD': {
    LOTID: 'LOT-MEAS-HOLD',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: 'ONHOLD',
    OPTYPE: 'M',
    PROCESSSTEP: 'THICK_MEAS',
  },
  'LOT-MEAS-PHOTO': {
    LOTID: 'LOT-MEAS-PHOTO',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'PHOTO',
    OPTYPE: 'M',
    PROCESSSTEP: 'PHOTO_MEAS',
  },
  'LOT-MEAS-IMP': {
    LOTID: 'LOT-MEAS-IMP',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'IMP',
    OPTYPE: 'M',
    PROCESSSTEP: 'IMP_MEAS',
  },
  'LOT-MEAS-UNREAD': {
    LOTID: 'LOT-MEAS-UNREAD',
    PRODUCT: 'PRD-MEAS-100',
    JOBCODE: 'JOB-M01',
    QUANTITY: '25',
    GOODCHIPS: '25',
    RECIPE: 'RCP-MEAS-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'THICK_MEAS',
    OPERSEQUENCE: '010',
    OPTYPE: 'M',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'DIFF',
    FACILITY: 'FAB1',
    COMMENTQTY: '3',
    NWCOMMENTQTY: '2',
    OXMACHINE: 'FURN-01',
    WAFERLIST: '1,2,3',
  },
  'LOT-MEAS-RESUSER': {
    LOTID: 'LOT-MEAS-RESUSER',
    PRODUCT: 'PRD-MEAS-100',
    JOBCODE: 'JOB-M01',
    QUANTITY: '25',
    GOODCHIPS: '25',
    RECIPE: 'RCP-MEAS-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'THICK_MEAS',
    OPERSEQUENCE: '010',
    OPTYPE: 'M',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    AREA: 'DIFF',
    FACILITY: 'FAB1',
    COMMENTQTY: '1',
    NWCOMMENTQTY: '0',
    LOTRESUSER: 'PARK_OP',
    MACHINENAME: 'MEQP-01',
    PORTNAME: 'PORT1',
    MACHINERECIPENAME: 'RCP-MEAS-01',
    OXMACHINE: 'FURN-01',
    WAFERLIST: '1,2,3,4,5',
  },
  'CVD-MOCK-001': {
    LOTID: 'CVD-MOCK-001',
    PRODUCT: 'CVD-MOCK-PRODUCT',
    JOBCODE: 'JOB-CVD-001',
    QUANTITY: '25',
    GOODCHIPS: '25',
    OPERATION: '10020',
    SUBOPERATION: '00',
    PROCESSSTEP: 'CVD PROCESS',
    OPERSEQUENCE: '10',
    OPTYPE: 'C',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    FACILITY: 'GUMI',
    CUSTOMER: 'HIFI-UI-DEMO',
    CATEGORY: 'DEMO',
    ENGINEER: 'CVD Engineer',
    PACKING: 'STANDARD',
    RECIPE: 'CVD:BASE-RECIPE',
    CHANGERECIPE: '',
    EQPGROUP: 'CVD01,CVD02',
    CHANGEEQPGROUP: '',
    COMMENTQTY: '2',
    NWCOMMENTQTY: '0',
    AREA: 'CVD',
    ETCMSG: '',
    LOTRESUSER: '',
    MACHINENAME: '',
    PORTNAME: '',
    MACHINERECIPENAME: '',
  },
  'LOT-IMP-01': {
    LOTID: 'LOT-IMP-01',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-01',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01',
    WORKEDRECIPE: 'RCP-IMP-STD-01',
    WORKEDEQPID: 'IMP-EQ-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
    COMMENTQTY: '1',
  },
  'LOT-IMP-02': {
    LOTID: 'LOT-IMP-02',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-02',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01', // Perfectly matches LOT-IMP-01
    WORKEDRECIPE: 'RCP-IMP-STD-01',
    WORKEDEQPID: 'IMP-EQ-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
    COMMENTQTY: '0',
  },

  // --- BRANCH FOR WARNING & BLOCKING UNREAD COMMENTS (NWCOMMENTQTY > 0) ---
  'LOT-IMP-CMT-01': {
    LOTID: 'LOT-IMP-CMT-01',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-03',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '1',
    COMMENTQTY: '1',
  },

  // --- DIVERGENT RECIPE BRANCH AT PORT 2 ---
  'LOT-IMP-DIFF-RCP': {
    LOTID: 'LOT-IMP-DIFF-RCP',
    PRODUCT: 'PROD-IMP-800',
    JOBCODE: 'JOB-IMP-04',
    QUANTITY: '20',
    RECIPE: 'RCP-IMP-OTHER-99', // Different from RCP-IMP-STD-01 -> Error message "RECIPE가 다른 LOT입니다."
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- RECIPE BRANCH INCLUDES A POPUP NOTIFICATION UPON SUCCESSFUL MEMORIZATION---
  'LOT-IMP-POPUP': {
    LOTID: 'LOT-IMP-POPUP',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-05',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-POPUP',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- RECIPE BRANCH ENCOUNTERING MEMORIZATION ERROR (START BUTTON LOCKED) ---
  'LOT-IMP-MEMO-ERR': {
    LOTID: 'LOT-IMP-MEMO-ERR',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-06',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-MEMO-FAIL',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- LOTINFO’S OPERATIONAL ERROR CATEGORIES ---
  'LOT-IMP-NOT-WIP': {
    LOTID: 'LOT-IMP-NOT-WIP',
    STATUS: 'WAIT',
    STATE: 'FIN', // Error: "FIN 상태 입니다. 자동화 진행이 불가합니다."
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-HOLD': {
    LOTID: 'LOT-IMP-HOLD',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: 'ONHOLD', // Error: "HOLD된 LOT입니다. 자동화 진행이 불가합니다."
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-BATCHED': {
    LOTID: 'LOT-IMP-BATCHED',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: 'BATCH-IMP-99', // Error: "BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다."
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-WRONG-AREA': {
    LOTID: 'LOT-IMP-WRONG-AREA',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'PHOTO', // Error: "IMP공정이 아닙니다. LOT을 확인 후 진행 바랍니다."
    LOTRESUSER: '',
  },
  'LOT-IMP-RESERVED': {
    LOTID: 'LOT-IMP-RESERVED',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: 'OP_USER_01', // Error: "이미 작업 예약되었거나 진행중인 LOT입니다."
  },
  'LOT-IMP-RUN': {
    LOTID: 'LOT-IMP-RUN',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-RUN',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01',
    WORKEDRECIPE: 'RCP-IMP-STD-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'RUN', // Error: "이미 MOVE IN된 LOT입니다."
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },
};

export const remoteMeasFixtures = {
  equipments: {
    'MEQP-01': {
      MAINEQPID: 'MMEQP-01',
      PROCEQPID: 'MEQP-01',
      EQPAREA: 'DIFF',
      EQPTYPE: 'THICKNESS',
      PMMESSAGE: '',
      PORTNAME: 'PORT1,PORT2',
      RECIPENAME: 'RCP-MEAS-01',
    },
    'MEQP-PM': {
      MAINEQPID: 'MMEQP-PM',
      PROCEQPID: 'MEQP-PM',
      EQPAREA: 'DIFF',
      EQPTYPE: 'THICKNESS',
      PMMESSAGE: '정기 PM 주기가 도래했습니다. 점검 후 진행하세요.',
      PORTNAME: 'PORT1,PORT2',
      RECIPENAME: 'RCP-MEAS-01',
    },
    'MEQP-BF': {
      MAINEQPID: 'MMEQP-BF',
      PROCEQPID: 'MEQP-BF',
      EQPAREA: 'DIFF',
      EQPTYPE: 'THICKNESS',
      PMMESSAGE: '',
      PORTNAME: 'PORT1,PORT2',
      RECIPENAME: 'RCP-MEAS-BF',
    },
  },
  ports: {
    'MMEQP-01:PORT1': {
      PORTSTATENAME: 'READY',
      PORTLOTNAME: '',
      ACKMSG: '',
    },
    'MMEQP-01:PORT2': {
      PORTSTATENAME: 'IDLE',
      PORTLOTNAME: '',
      ACKMSG: '',
    },
    'MMEQP-PM:PORT1': {
      PORTSTATENAME: 'RUN',
      PORTLOTNAME: 'LOT-PREV-01',
      ACKMSG: 'PORT 1 Busy',
    },
    'MMEQP-PM:PORT2': {
      PORTSTATENAME: 'READY',
      PORTLOTNAME: '',
      ACKMSG: '',
    },
    'MMEQP-BF:PORT1': {
      PORTSTATENAME: 'READY',
      PORTLOTNAME: '',
      ACKMSG: '',
    },
    'MMEQP-BF:PORT2': {
      PORTSTATENAME: 'IDLE',
      PORTLOTNAME: '',
      ACKMSG: '',
    },
  },
};

export const edcFixtures = {
  'LOT-DEMO-01': {
    PROCESSTYPE: 'THICK',
    ITEMS: {
      ITEM: [
        {
          SLOTID: '01',
          PRODEQPID1: 'ETCH-01',
          MEASEQPID: 'METRO-01',
          PARAMETER: 'THICKNESS',
          RECIPEID: 'RCP-THK-01',
          MIN: '1.20',
          MAX: '1.40',
          AVG: '1.31',
          QUL: '1.25',
          QCL: '1.30',
          QLL: '1.35',
          SITECOUNT: '9',
          VALUE1: '1.29',
          VALUE2: '1.30',
          VALUE3: '1.31',
          VALUE4: '1.32',
          VALUE5: '1.30',
          VALUE6: '1.31',
          VALUE7: '1.33',
          VALUE8: '1.30',
          VALUE9: '1.31',
          RANGE: '0.14',
        },
      ],
    },
  },
  'LOT-EDC-CD-01': {
    PROCESSTYPE: 'CD',
    ITEMS: {
      ITEM: [
        {
          SLOTID: '02',
          PRODEQPID1: 'PHOTO-01',
          MEASEQPID: 'CD-SEM-01',
          PARAMETER: 'CD',
          RECIPEID: 'RCP-CD-02',
          MIN: '0.18',
          MAX: '0.22',
          AVG: '0.20',
          QUL: '0.19',
          QCL: '0.20',
          QLL: '0.21',
          SITECOUNT: '9',
          VALUE1: '0.20',
          VALUE2: '0.19',
          VALUE3: '0.21',
          VALUE4: '0.20',
          VALUE5: '0.20',
          VALUE6: '0.19',
          VALUE7: '0.21',
          VALUE8: '0.20',
          VALUE9: '0.20',
          RANGE: '0.02',
        },
      ],
    },
  },
  'LOT-EDC-OVERLAY-01': {
    PROCESSTYPE: 'OVERLAY',
    ITEMS: {
      ITEM: [
        {
          SLOTID: '03',
          PRODEQPID1: 'PHOTO-02',
          MEASEQPID: 'OVL-01',
          PARAMETER: 'OVERLAY-X/Y',
          RECIPEID: 'RCP-OVL-03',
          MINX: '-0.15',
          MINY: '-0.12',
          MAXX: '0.16',
          MAXY: '0.14',
          AVGX: '0.02',
          AVGV: '-0.01',
          QUL: '0.10',
          QCL: '0.00',
          QLL: '-0.10',
          SITECOUNT: '19',
          ...Object.fromEntries(
            Array.from({ length: 19 }, (_unused, index) => [`VALUE${index + 1}`, '0.01']),
          ),
          RANGEX: '0.31',
          RANGEY: '0.26',
        },
      ],
    },
  },
  'LOT-EDC-EMPTY-01': {
    PROCESSTYPE: 'THICK',
    ITEMS: { ITEM: [] },
  },
};

export const bayFixtures = {
  bays: ['BAY-A', 'BAY-B', 'BAY-01'],
  stockersByBay: {
    'BAY-A': ['STK-A', 'STK-B'],
    'BAY-B': ['STK-C'],
    'BAY-01': ['STK-01', 'STK-02'],
    // Setting bays (GUMI:PHOTO) so BAY별 LOT 현황 has stockers after a real Setting flow.
    P01: ['STK-P01A', 'STK-P01B'],
    P02: ['STK-P02A'],
    BAY01: ['STK01', 'STK02'],
    BAY02: ['STK01', 'STK02'],
  },
};

const blstLot = (BAY, JOBCODE, PROCESSSTEP, LOTID, LOCATION, QUANTITY, LOC_TYPE = 'S') => ({
  BAY,
  JOBCODE,
  PROCESSSTEP,
  LOTID,
  LOCATION,
  QUANTITY,
  LOC_TYPE,
});

/**
 * BAY별 LOT 현황 (LotStatusByBayActivity) BLSTINFO rows. LOC_TYPE 'S' means the LOT is inside
 * the stocker named by LOCATION; any other LOC_TYPE blocks 출고 and 반송 in the legacy app.
 * JOBCODE 'FAIL' and LOTIDs containing 'FAIL' trigger business FAIL envelopes.
 */
export const lotStatusByBayFixtures = {
  lots: [
    blstLot('BAY-A', 'J100', 'PHOTO-COAT', 'LOT-A001', 'STK-A', '25'),
    blstLot('BAY-A', 'J100', 'PHOTO-EXPOSE', 'LOT-A002', 'STK-A', '24'),
    blstLot('BAY-A', 'J200', 'PHOTO-DEVELOP', 'LOT-A003', 'STK-B', '25'),
    blstLot('BAY-A', 'J200', 'ETCH-MAIN', 'LOT-A004', 'EQP-ETCH01', '13', 'E'),
    blstLot('BAY-A', 'J300', 'CLEAN', 'LOT-A005', 'STK-B', '25'),
    blstLot('BAY-A', 'J300', 'CVD-OXIDE', 'LOT-A006', 'STK-A', '20'),
    blstLot('BAY-A', 'J300', 'CMP', 'LOT-A007', 'STK-A', '25'),
    blstLot('BAY-A', 'J400', 'IMP-HIGH', 'LOT-FAIL01', 'STK-B', '25'),
    blstLot('BAY-B', 'J500', 'DIFF-ANNEAL', 'LOT-B001', 'STK-C', '25'),
    blstLot('BAY-01', 'J600', 'MEAS-THK', 'LOT-0101', 'STK-01', '25'),
    blstLot('BAY-01', 'J600', 'MEAS-CD', 'LOT-0102', 'STK-02', '12'),
    blstLot('P01', 'J100', 'PHOTO-COAT', 'LOT-P001', 'STK-P01A', '25'),
    blstLot('P01', 'J100', 'PHOTO-EXPOSE', 'LOT-P002', 'STK-P01B', '25'),
    blstLot('P01', 'J200', 'PHOTO-DEVELOP', 'LOT-P003', 'EQP-PH01', '24', 'E'),
  ],
  stockOuts: [],
};

export const wetAutoFixtures = {
  equipmentById: {
    'WET-EQP-01': {
      MAINEQPID: 'WET-MAIN-01',
      JOBID: 'JOB-WET-01',
      PCOUNT: 'Y',
      EQPTYPE: 'WET',
      EQPAREA: 'WET-AREA',
      PMMESSAGE: '',
    },
    'WET-EQP-PM': {
      MAINEQPID: 'WET-MAIN-PM',
      JOBID: 'JOB-WET-PM',
      PCOUNT: 'N',
      EQPTYPE: 'WET',
      EQPAREA: 'WET-AREA',
      PMMESSAGE: 'PM 점검 주기를 확인하세요.',
    },
  },
  startFailureMachine: 'WET-EQP-FAIL-START',
};

/**
 * activity_setting.xml message fixtures.
 *
 * The special values deliberately exercise the legacy branches: a successful
 * empty list and a business FAIL envelope. They remain in the mock server
 * only; the Vue feature never injects these values itself.
 */
export const settingFixtures = {
  facilities: ['GUMI', 'ICHEON', 'EMPTY-AREA', 'FAIL-AREA'],
  areasByFacility: {
    GUMI: ['PHOTO', 'ETCH', 'EMPTY-BAY', 'FAIL-BAY'],
    ICHEON: ['DIFF'],
    'EMPTY-AREA': [],
  },
  baysByLocation: {
    'GUMI:PHOTO': ['P01', 'P02'],
    'GUMI:ETCH': ['E01'],
    'ICHEON:DIFF': ['D01'],
    'GUMI:EMPTY-BAY': [],
  },
};

export const eenModifyFixtures = {
  tagsByFacility: {
    GUMI: [
      ['TAG-001', 'Designer Review and approve before production'],
      ['TAG-002', '두 번째 TAG 설명'],
    ],
    'EMPTY-TAGS': [],
  },
  itemsByEenId: {
    'EEN-0001': {
      actionPoint: 'MOVEIN',
      tagId: 'TAG-001',
      tagComment: 'Designer Review and approve before production',
      changeCause: '',
    },
    'EEN-0002': {
      actionPoint: 'MOVEOUT',
      tagId: 'TAG-002',
      tagComment: '두 번째 TAG 설명',
      changeCause: '',
    },
  },
  // GETEENLIST rows (EENSettingActivity grid columns) per LOT; the changes above overlay them.
  // LOT names containing ERROR fail, other unknown LOTs return no rows.
  rowsByLot: {
    'LOT-DEMO-01': ['EEN-0001', 'EEN-0002'],
    'LOT-260927-001': ['EEN-0001', 'EEN-0002'],
  },
  rows: {
    'EEN-0001': {
      EENID: 'EEN-0001',
      PROCESSOPERATIONNAMEDESC: 'PHOTO-EXPOSURE',
      FACTORYNAME: 'GUMI',
      PRODUCTSPECNAME: 'HIFI-UI-DEMO',
      PROCESSFLOWNAME: 'PHOTO-DEMO',
      PROCESSOPERATIONNAME: '1200',
      CREATETIME: '2026-10-28 09:12:30',
      CREATEUSER: 'DEMO',
      CONFIRMUSER: '',
      CONFIRMTIME: '',
      DESCRIPTION: 'PHOTO-EXPOSURE-DESC',
    },
    'EEN-0002': {
      EENID: 'EEN-0002',
      PROCESSOPERATIONNAMEDESC: 'ETCH-MAIN',
      FACTORYNAME: 'GUMI',
      PRODUCTSPECNAME: 'HIFI-UI-DEMO',
      PROCESSFLOWNAME: 'PHOTO-DEMO',
      PROCESSOPERATIONNAME: '1300',
      CREATETIME: '2026-10-29 14:40:05',
      CREATEUSER: 'DEMO',
      CONFIRMUSER: 'LEADER',
      CONFIRMTIME: '2026-10-29 15:02:11',
      DESCRIPTION: 'ETCH-MAIN-DESC',
    },
  },
};

const activityBatchLot = {
  PRODUCT: 'PRODUCT-ACT',
  OPERATION: '1100',
  SUBOPERATION: '00',
  PROCESSSTEP: 'DIFF',
  QUANTITY: '25',
  BATCHID: '',
  STEPRECIPE: 'RCP-ACT',
  LIMITZONE: 'O',
  STATUS: 'RUN',
  VIEWCOUNT: '1/2/3',
  PROCESSNAME: '',
  PTIN: 'Y',
  PTSPEC: 'Y',
  CHECKQTIME: '',
  PROCESSOPERATIONTYPE: 'TYPE-A',
  JALOT: '',
  MOLOT: '',
  CHECKRECIPE: 'RCP-ACT',
  JACOUNT: '1',
  LIMITRECIPE: 'RCP-ACT',
  FQCSAMPLE: '',
  CHECKMACHINE: '',
  CHECKOPERTION: '',
  CHECKDEPOCOMMENT: '',
  CHECKTHCIKNESSCOMMENT: '',
  CHECKRECYCLECOMMENT: '',
  MAXBATCHMESSAGE: '',
};

function activityBatchFixture(
  batchId,
  lotId,
  parentBatchId = '',
  childZone = '',
  batchType = 'R',
  monitorWaferCount = '1',
) {
  return {
    context: {
      batchId,
      lotId,
      eqpId: 'EQP-BATCH',
      recipe: 'RCP-ACT',
      comment: '',
      transport: 'N',
      facility: 'KFAB',
      batchType,
      monitorWaferCount,
      parentBatchId,
      childZone,
    },
    checkParameter: 'N',
    unreadWorkCommentQty: 0,
    items: [
      {
        num: 0,
        lotId,
        status: 'RUN',
        product: 'PRODUCT-ACT',
        quantity: '25',
        processStep: 'DIFF',
        operation: '1100',
        subOperation: '00',
        recipe: 'RCP-ACT',
        isdcol: 'Y',
        viewCount: '1/2/3',
        thin: 'TH measurement',
        thspec: 'TH spec',
        ptin: '',
        ptspec: 'PT spec',
        commentQty: 0,
        nwCommentQty: 0,
        errorMessage: '',
        lotState: 'WIP',
        operSequence: '001',
        opType: 'MVOU',
        bayName: '',
        stockerName: '',
      },
    ],
  };
}

export const batchFixtures = {
  'BAT-ACT-MONITOR': activityBatchFixture('BAT-ACT-MONITOR', 'LOT-ACT-MONITOR', '', '', 'M', '3'),
  'BAT-ACT-MAXEXISTING': activityBatchFixture('BAT-ACT-MAXEXISTING', 'LOT-ACT-MAXEXISTING'),
  'PBAT-ACT-01': activityBatchFixture('PBAT-ACT-01', 'LOT-ACT-PARENT'),
  'PBAT-ACT-02': activityBatchFixture('PBAT-ACT-02', 'LOT-ACT-PARENT-02'),
  'PBAT-ACT-FAIL': activityBatchFixture('PBAT-ACT-FAIL', 'LOT-ACT-PARENT-FAILZONE'),
  'CBAT-ACT-01': activityBatchFixture('CBAT-ACT-01', 'LOT-ACT-CHILD-01', 'PBAT-ACT-01', 'P03'),
  'CBAT-ACT-02': activityBatchFixture('CBAT-ACT-02', 'LOT-ACT-CHILD-02', 'PBAT-ACT-01', 'P04'),
  'BAT-ACT-EXISTING': activityBatchFixture('BAT-ACT-EXISTING', 'LOT-ACT-EXISTING'),
  BAT2026092201: {
    context: {
      batchId: 'BAT2026092201',
      lotId: 'LOT2026092201 01',
      eqpId: 'EQP-BATCH',
      recipe: 'RCP-BATCH',
      comment: '',
      transport: 'N',
      facility: 'KFAB',
    },
    checkParameter: 'N',
    unreadWorkCommentQty: 0,
    items: [
      {
        lotId: 'LOT2026092201 01',
        commentQty: 0,
        status: 'RUN',
        processStep: 'DIFF',
        product: 'PRODUCT-BATCH',
        quantity: '25',
        errorMessage: '',
        operation: '1100',
        subOperation: '00',
        lotState: 'WIP',
        nwCommentQty: 0,
        operSequence: '001',
        opType: 'MVOU',
        bayName: 'BAY-01',
        stockerName: 'STK-01',
      },
      {
        lotId: 'LOT2026092201 02',
        commentQty: 0,
        status: 'RUN',
        processStep: 'DIFF',
        product: 'PRODUCT-BATCH',
        quantity: '25',
        errorMessage: '',
        operation: '1100',
        subOperation: '00',
        lotState: 'WIP',
        nwCommentQty: 0,
        operSequence: '002',
        opType: 'MVOU',
        bayName: 'BAY-01',
        stockerName: 'STK-01',
      },
      {
        lotId: 'LOT2026092201 03',
        commentQty: 0,
        status: 'RUN',
        processStep: 'DIFF',
        product: 'PRODUCT-BATCH',
        quantity: '25',
        errorMessage: '',
        operation: '1100',
        subOperation: '00',
        lotState: 'WIP',
        nwCommentQty: 0,
        operSequence: '003',
        opType: 'MVOU',
        bayName: 'BAY-01',
        stockerName: 'STK-01',
      },
    ],
  },
  'BATCH-DEMO-01': {
    context: {
      batchId: 'BATCH-DEMO-01',
      lotId: 'LOT-BATCH-01',
      eqpId: 'EQP-BATCH',
      recipe: 'RCP-BATCH',
      comment: 'Move out comment',
      transport: 'Y',
      facility: 'KFAB',
    },
    checkParameter: 'Y',
    unreadWorkCommentQty: 0,
    items: [
      {
        lotId: 'LOT-BATCH-01',
        commentQty: 0,
        status: 'RUN',
        processStep: 'DIFF',
        product: 'PRODUCT-BATCH',
        quantity: '25',
        errorMessage: '',
        operation: '1100',
        subOperation: '00',
        lotState: 'WIP',
        nwCommentQty: 0,
        operSequence: '002',
        opType: 'MVOU',
        bayName: 'BAY-01',
        stockerName: 'STK-01',
        processName: '',
        thickArea: '',
      },
      {
        lotId: 'LOT-DIFF-01',
        commentQty: 0,
        status: 'RUN',
        processStep: 'DIFF',
        product: 'PRODUCT-DIFF',
        quantity: '25',
        errorMessage: '',
        operation: '1100',
        subOperation: '00',
        lotState: 'WIP',
        nwCommentQty: 0,
        operSequence: '003',
        opType: 'MVOU',
        bayName: 'BAY-01',
        stockerName: 'STK-02',
        processName: '',
        thickArea: '',
      },
    ],
  },
};

export const activityBatchFixtures = {
  nextBatchNumber: 1,
  equipmentByEqp: {
    'EQP-BATCH': { EQPID: 'EQP-BATCH', MSG: '' },
    BATCH: { EQPID: 'EQP-BATCH', MSG: '' },
    // Android eqpId removes EQP- plus the final barcode character.
    BATC: { EQPID: 'EQP-BATCH', MSG: '' },
    'EQP-ACT': { EQPID: 'EQP-ACT', MSG: '장비 확인 메시지' },
    AC: { EQPID: 'EQP-ACT', MSG: '장비 확인 메시지' },
    ...Object.fromEntries(
      [
        'BATCH-SAMPLE',
        'BATCH-REMOTE',
        'BATCH-WARNING',
        'BATCH-FAIL-CHECK',
        'BATCH-FAIL-CREATE',
      ].map((EQPID) => [EQPID, { EQPID, MSG: '' }]),
    ),
  },
  lots: {
    ...Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [`LOT-ACT-0${index + 1}`, { ...activityBatchLot }]),
    ),
    ...Object.fromEntries(
      [
        'CHECKMACHINE',
        'CHECKOPERTION',
        'CHECKDEPOCOMMENT',
        'CHECKTHCIKNESSCOMMENT',
        'CHECKRECYCLECOMMENT',
        'MAXBATCHMESSAGE',
      ].map((field) => [`LOT-ACT-${field}`, { ...activityBatchLot, [field]: `${field} 확인` }]),
    ),
    'LOT-ACT-WARNING': {
      ...activityBatchLot,
      CHECKQTIME: 'Q-Time 확인',
      FQCSAMPLE: 'FQC Sample 확인',
    },
    'LOT-ACT-DUMMY': {
      ...activityBatchLot,
      PROCESSNAME: 'MW_TEST',
      PROCESSOPERATIONTYPE: 'DUMMY-TYPE',
      CHECKRECIPE: 'DUMMY-RCP',
    },
    'LOT-ACT-ZONE': { ...activityBatchLot, LIMITZONE: 'X' },
    'LOT-ACT-STATUS': { ...activityBatchLot, STATUS: 'WAIT' },
    'LOT-ACT-TYPE': { ...activityBatchLot, PROCESSOPERATIONTYPE: 'TYPE-B' },
    'LOT-ACT-RECIPE': { ...activityBatchLot, CHECKRECIPE: 'RCP-OTHER' },
    'LOT-ACT-NOMEASURE': { ...activityBatchLot, PTIN: '', PTSPEC: '' },
    'LOT-ACT-ONE': { ...activityBatchLot, JALOT: 'CBAT-ACT-01', JACOUNT: '1' },
    'LOT-ACT-MANY': { ...activityBatchLot, JALOT: 'PBAT-ACT-01', JACOUNT: '2' },
    'LOT-ACT-MOTHER': { ...activityBatchLot, MOLOT: 'PBAT-ACT-01' },
    'LOT-ACT-PARENT': { ...activityBatchLot, JALOT: 'PBAT-ACT-01', JACOUNT: '2' },
    'LOT-ACT-CHILD-01': { ...activityBatchLot, MOLOT: 'PBAT-ACT-01' },
    'LOT-ACT-CHILD-02': { ...activityBatchLot, MOLOT: 'PBAT-ACT-01' },
    'LOT-ACT-EXISTING': { ...activityBatchLot },
    'LOT-ACT-MONITOR': { ...activityBatchLot },
    'LOT-ACT-MAXEXISTING': { ...activityBatchLot, MAXBATCHMESSAGE: 'MAXBATCHMESSAGE 확인' },
    'LOT-ACT-NOPARENT': { ...activityBatchLot },
    'LOT-ACT-PARENTFAIL': { ...activityBatchLot },
  },
  parentBatchIdsByEqp: {
    'EQP-BATCH': [
      { BATCHID: 'PBAT-ACT-01' },
      { BATCHID: 'PBAT-ACT-02' },
      { BATCHID: 'PBAT-ACT-FAIL' },
    ],
  },
  zonesByBatchId: { 'PBAT-ACT-01': 'P03', 'PBAT-ACT-02': 'P04' },
  precheckByEqp: {
    'BATCH-SAMPLE': {
      BATCHMESSGE: 'Sampling 확인',
      CUMCOUNT: '2',
      MAXCOUNT: '10',
      UPDATEFLAG: 'Y',
      UVFLAG: 'N',
      SAMPLECYCLE: '5',
    },
    'BATCH-REMOTE': { REMOTE: 'Y' },
    'BATCH-FAIL-CHECK': { error: 'Batch 사전 확인 실패' },
  },
  createResultByEqp: {
    'BATCH-WARNING': {
      INTERLOCKMSG: 'Batch Interlock 확인',
      TTINTERLOCKMSG: 'TT Interlock 확인',
      NOTICEDOWN: 'Notice Down 확인',
    },
    'BATCH-FAIL-CREATE': { error: 'Batch 처리 실패' },
  },
  batchCountView: 'RUN : 2\nM : 1',
};

export const waferSelectFixtures = {
  dummyEqpInfoByEqp: {
    'EQP-DEMO': { EQPID: 'EQP-DEMO' },
    'EQP-BATCH': { EQPID: 'EQP-BATCH' },
    'DIFF-01': { EQPID: 'DIFF-01' },
  },
  lotLastEventByLot: {
    'LOT-DEMO-01': {
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: 'SLOT : 01(EQP-DEMO),02(EQP-DEMO),03(EQP-DEMO)',
    },
    'LOT-BATCH-01': {
      CREATECATEGORY: 'COUNT',
      LASTEVENTCOMMENT: 'COUNT:25',
    },
    'LOT-DIFF-01': {
      CREATECATEGORY: 'SLOT',
      LASTEVENTCOMMENT: 'SLOT : 01(DIFF-01),02(DIFF-01),03(DIFF-01)',
    },
  },
};

const commentListPreviewItems = [
  {
    no: '0001',
    subOperation: 'INSP',
    workCode: 'W',
    trackType: 'CURRENT',
    isCheck: false,
    writer: 'KIM HS',
    writeTime: '2026-09-15 08:12',
    reader: '',
    readTime: '',
    description: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
  },
  {
    no: '0002',
    subOperation: 'INSP',
    workCode: 'N',
    trackType: 'LOT',
    isCheck: true,
    writer: 'LEE MJ',
    writeTime: '2026-09-15 08:28',
    reader: 'PARK DW',
    readTime: '2026-09-15 08:41',
    description: 'Recipe verified after previous chamber tuning. Continue normal inspection.',
  },
  {
    no: '0003',
    subOperation: 'ETCH',
    workCode: 'W',
    trackType: 'HISTORY',
    isCheck: false,
    writer: 'CHOI AR',
    writeTime: '2026-09-15 09:03',
    reader: '',
    readTime: '',
    description: 'Previous step reported minor particle trend. Confirm SPC note before proceed.',
  },
];

function commentListPreviewRows(lotId, context) {
  return commentListPreviewItems.map((item) => ({
    ...item,
    lotId,
    operation: context.operation,
    processStep: context.processStep,
    operSequence: '0042',
    pw: '1234',
    isCurrent: 'Y',
  }));
}

export const commentFixtures = [
  ...commentListPreviewRows('LOT-A260915-018', {
    operation: 'PHOTO',
    processStep: 'Final Inspection',
  }),
  ...commentListPreviewRows('LOT-KJ-001', {
    operation: 'FURNACE',
    processStep: 'REMOTE FURNACE KJ',
  }),
  {
    no: '1',
    lotId: 'LOT-DEMO-01',
    operation: '1000',
    subOperation: '00',
    processStep: 'PHOTO',
    operSequence: '001',
    workCode: 'W',
    trackType: 'A',
    isCheck: false,
    writer: 'ENGINEER',
    writeTime: '2026-09-25 09:00:00',
    reader: '',
    readTime: '',
    description: 'Move Out 확인 COMMENT',
    pw: 'PASS',
    isCurrent: 'Y',
  },
  {
    no: '1',
    lotId: 'CVD-MOCK-001',
    operation: '10020',
    subOperation: '00',
    processStep: 'CVD PROCESS',
    operSequence: '10',
    workCode: 'W',
    trackType: 'A',
    isCheck: false,
    writer: 'ENGINEER',
    writeTime: '2026-10-15 09:00:00',
    reader: '',
    readTime: '',
    description: 'Remote CVD review comment',
    pw: 'PASS',
    isCurrent: 'Y',
  },
  {
    no: '2',
    lotId: 'LOT-IMP-CMT-01',
    operation: '3100',
    subOperation: '00',
    processStep: 'IMP',
    operSequence: '001',
    workCode: 'W',
    trackType: 'A',
    isCheck: false,
    writer: 'IMP_ENG',
    writeTime: '2026-10-19 08:00:00',
    reader: '',
    readTime: '',
    description: 'IMP Dose량 확인 후 작업 진행 바랍니다.',
    pw: 'PASS',
    isCurrent: 'Y',
  },
  {
    no: '0001',
    lotId: 'WET-LOT-01',
    operation: '2100',
    subOperation: '010',
    processStep: 'WET-STEP',
    operSequence: '003',
    workCode: 'W',
    trackType: 'CURRENT',
    isCheck: false,
    writer: 'WET-ENGINEER',
    writeTime: '2026-11-02 09:00:00',
    reader: '',
    readTime: '',
    description: 'Verify the WET process before START.',
    pw: 'PASS',
    isCurrent: 'Y',
  },
];

// Dev-only preview scenarios for manually exercising CommentViewPage states via
// POST /comment(Set)?scenario=<key>, bypassing the normal COMMENT/COMMENTSET AIFMSG flow.
// `current-writable` is the fallback scenario used when an unknown key is requested.
// Shape and exact text are pinned by mock-server/tests/remote-wet.test.js.
export const commentViewPreviewScenarios = {
  'current-writable': {
    response: {
      DESCRIPTION: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
  },
  'current-checked': {
    response: {
      DESCRIPTION: 'Recipe verified after previous chamber tuning. Continue normal inspection.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'N',
      ISCHECK: 'Y',
    },
  },
  'current-read-only': {
    response: {
      DESCRIPTION: 'Previous step reported minor particle trend. Confirm SPC note before proceed.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'N',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
  },
  historical: {
    response: {
      DESCRIPTION: 'Historical track entry retained for audit; no further action required.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'N',
      WORKCODE: 'N',
      ISCHECK: 'Y',
    },
  },
  empty: {
    response: {
      DESCRIPTION: '',
      PROCESSSTEP: '',
      PW: '',
      ISCURRENT: 'N',
      WORKCODE: '',
      ISCHECK: 'N',
    },
  },
  'comment-set-error': {
    response: {
      DESCRIPTION: 'Preview comment: COMMENTSET fails for this scenario.',
      PROCESSSTEP: 'Final Inspection',
      PW: '1234',
      ISCURRENT: 'Y',
      WORKCODE: 'W',
      ISCHECK: 'N',
    },
    commentSetError: 'Unable to confirm comment in mock mode.',
  },
  'comment-error': {
    commentError: 'Unable to load comment in mock mode.',
  },
};

export const remoteCvdFixtures = {
  equipmentById: {
    CVD01: {
      MAINEQPID: 'CVD-MAIN-01',
      PROCEQPID: 'CVD01',
      EQPAREA: 'CVD',
      EQPTYPE: 'CVD',
      ISDOOROPEN: 'Y',
      PMMESSAGE: '',
      PORTNAME: '1,2',
      CYCLE_MESSAGE: '',
      PARA1: '92%',
      PARA1_LIMIT: 'N80',
      PARA2: '18%',
      PARA2_LIMIT: 'N90',
      PARA3: '11%',
      PARA3_LIMIT: 'N90',
      PARA4: '6%',
      PARA4_LIMIT: 'OVER',
    },
    'CVD-EMPTY': {
      MAINEQPID: 'CVD-EMPTY',
      PROCEQPID: 'CVD-EMPTY',
      EQPAREA: 'CVD',
      EQPTYPE: 'CVD',
      ISDOOROPEN: 'N',
      PMMESSAGE: '',
      PORTNAME: '',
      CYCLE_MESSAGE: '',
      PARA1: '',
      PARA1_LIMIT: '',
      PARA2: '',
      PARA2_LIMIT: '',
      PARA3: '',
      PARA3_LIMIT: '',
      PARA4: '',
      PARA4_LIMIT: '',
    },
    TE8500_01: {
      MAINEQPID: 'TE8500-MAIN-01',
      PROCEQPID: 'TE8500_01',
      EQPAREA: 'CVD',
      EQPTYPE: 'TE8500',
      ISDOOROPEN: 'Y',
      PMMESSAGE: '',
      PORTNAME: '1',
      CYCLE_MESSAGE: '',
      PARA1: '',
      PARA1_LIMIT: '',
      PARA2: '',
      PARA2_LIMIT: '',
      PARA3: '',
      PARA3_LIMIT: '',
      PARA4: '',
      PARA4_LIMIT: '',
    },
  },
  recipeInfoByEquipment: {
    CVD01: { RECIPE: 'CVD:RECIPE-A,RECIPE-B', DOWN_CH: '' },
    'CVD-EMPTY': { RECIPE: '', DOWN_CH: '' },
    TE8500_01: { RECIPE: 'TE8500:RECIPE-A', DOWN_CH: '' },
  },
  teRcpByEquipment: {
    CVD01: { TE_FLAG: 'N', TE_RCP: '', TE_ORDERS: '0' },
  },
  memorizationByEquipment: {
    CVD01: {
      POPUP: '',
      ETCH_COMMRCP: 'Y',
      'Q-TIME': '',
      PRECEDE_FLAG: '',
      PRECEDE_FLAG_ETCH: '',
      QTIME_FLAG: '',
      QTIME_FLAG_W: '',
    },
  },
  portsByEquipment: {
    'CVD-MAIN-01': {
      1: {
        PORTSTATENAME: 'READY',
        PORTLOTNAME: '',
        ACKMSG: '',
        CHMA_RET: '',
        CHMB_RET: '',
      },
      2: {
        PORTSTATENAME: 'IDLE',
        PORTLOTNAME: '',
        ACKMSG: '',
        CHMA_RET: '',
        CHMB_RET: '',
      },
    },
  },
  doorOpenRequests: [],
  etchCommRcpByEquipment: {
    DEFAULT: {
      DOWNLOAD: 'Y',
      PROCESS_TYPE: 'eMAX CT',
      SAMPLE_CHK: 'Sample verification required before run',
      OWNERCODE: 'EMAX_OWN_02',
      EQP_TYPE: 'eMAX',
      PARA2ND: 'RF_TUNING',
      VALUE2ND: '150W',
      COMM2ND: '',
      STI_PROC_RCP: 'PROC_ETCH_REPLACED_01',
      COMMRCP: [
        {
          CHAMBER: 'CH1',
          ETCVALUE: 'RF Top',
          BASE_VALUE: '300',
          TUNE_VALUE: '320',
          STEP: '1',
          RMS_PARANAME: 'RF_TOP_PWR',
          RESULT: '',
        },
        {
          CHAMBER: 'CH1',
          ETCVALUE: 'RF Bottom',
          BASE_VALUE: '100',
          TUNE_VALUE: '110',
          STEP: '1',
          RMS_PARANAME: 'RF_BOT_PWR',
          RESULT: '',
        },
        {
          CHAMBER: 'CH1',
          ETCVALUE: 'Pressure',
          BASE_VALUE: '20',
          TUNE_VALUE: '25',
          STEP: '2',
          RMS_PARANAME: 'CH_PRESS',
          RESULT: '',
        },
        {
          CHAMBER: 'CH1',
          ETCVALUE: 'O2 Flow',
          BASE_VALUE: '15',
          TUNE_VALUE: '',
          STEP: '2',
          RMS_PARANAME: 'O2_FLOW',
          RESULT: '',
        },
      ],
    },
    TE8500: {
      DOWNLOAD: 'Y',
      PROCESS_TYPE: 'TE8500',
      SAMPLE_CHK: '',
      OWNERCODE: 'TE_OP_01',
      EQP_TYPE: 'TE8500',
      COMM2ND: '60 초',
      STI_PROC_RCP: '',
      COMMRCP: [
        { COL: '진행 TIME', VALUE: '60', RESULT: '' },
        { COL: 'RF POWER', VALUE: '450', RESULT: '' },
        { COL: 'PRESSURE', VALUE: '25.0', RESULT: '' },
        { COL: 'UNUSED_PARAM', VALUE: '-', RESULT: '' },
      ],
    },
    EMPTY: {
      DOWNLOAD: 'N',
      PROCESS_TYPE: 'eMAX CT',
      SAMPLE_CHK: '',
      OWNERCODE: 'EMPTY_OWNER',
      EQP_TYPE: 'CVD',
      COMMRCP: [],
    },
  },
  etchRcpDownloads: [],
};

export const diffFixtures = {
  lots: {
    'LOT-DIFF-01': {
      LOTPROCESSSTATE: 'RUN',
      BATCHID: 'BAT202048248',
      MACHINENAME: 'DIFF-01',
      PROCESSOPERATIONNAME: '2200',
      REUPDATE: 'N',
    },
  },
  parametersByMachine: {
    'DIFF-01': [
      { NO: '1', TITLEPARAMETER: 'CD', MIN: '0.10', MAX: '0.15', DATA: '' },
      { NO: '2', TITLEPARAMETER: 'THK', MIN: '520', MAX: '560', DATA: '' },
      { NO: '3', TITLEPARAMETER: 'OVL-X', MIN: '-0.2', MAX: '-0.2', DATA: '' },
      { NO: '4', TITLEPARAMETER: 'OVL-Y', MIN: '-0.2', MAX: '0.2', DATA: '' },
      { NO: '5', TITLEPARAMETER: 'FOCUS', MIN: '-3', MAX: '3', DATA: '' },
      { NO: '6', TITLEPARAMETER: 'DOSE', MIN: '18', MAX: '22', DATA: '' },
      { NO: '7', TITLEPARAMETER: 'SHIFT', MIN: '-5', MAX: '5', DATA: '' },
      { NO: '8', TITLEPARAMETER: 'ALIGN', MIN: '0', MAX: '10', DATA: '' },
    ],
  },
};

export const rcpFixtures = {
  recipesByLot: {
    'LOT-DEMO-01': {
      PRODUCTSPECNAME: 'PRODUCT-DEMO',
      PROCESSOPERATIONNAME: '1000-00',
      OPERATIONDESCRIPTION: 'PHOTO MEASURE',
      CATEGORY: 'CDOVERAYVI',
      RCPOVITEMS: [
        { OVRCP: 'OV-RCP-A01', OVMACHINE: 'OVL-EQ-01' },
        { OVRCP: 'OV-RCP-A02', OVMACHINE: 'OVL-EQ-02' },
      ],
      RCPVIITEMS: [
        { MACHINERECIPENAME: 'VI-RCP-B01', MACHINENAME: 'VI-EQ-01' },
        { MACHINERECIPENAME: 'VI-RCP-B02', MACHINENAME: 'VI-EQ-02' },
      ],
      RCPCDITEMS: [
        { CDRCP: 'CD-RCP-C01', CDMACHINE: 'CD-EQ-01' },
        { CDRCP: 'CD-RCP-C02', CDMACHINE: 'CD-EQ-02' },
      ],
      MASKITEMS: [
        { RETICLENAME: 'MASK-D01', MACHINENAME: 'EXP-EQ-01' },
        { RETICLENAME: 'MASK-D02', MACHINENAME: 'EXP-EQ-02' },
      ],
      RCPITEMS: [],
    },
    'LOT-BATCH-01': {
      PRODUCTSPECNAME: 'PRODUCT-BATCH',
      PROCESSOPERATIONNAME: '1100-00',
      OPERATIONDESCRIPTION: 'PQC REVIEW',
      CATEGORY: 'PQC',
      RCPOVITEMS: [],
      RCPVIITEMS: [],
      RCPCDITEMS: [],
      MASKITEMS: [],
      RCPITEMS: [{ REVIEW_EQUIP: 'PQC-EQ-01' }, { REVIEW_EQUIP: 'PQC-EQ-02' }],
    },
    'LOT-DIFF-01': {
      PRODUCTSPECNAME: 'PRODUCT-DIFF',
      PROCESSOPERATIONNAME: '2200-00',
      OPERATIONDESCRIPTION: 'THICKNESS MEASURE',
      CATEGORY: 'THIK',
      RCPOVITEMS: [],
      RCPVIITEMS: [],
      RCPCDITEMS: [],
      MASKITEMS: [],
      RCPITEMS: [
        { MACHINERECIPENAME: 'THIK-RCP-01', MACHINENAME: 'THK-EQ-01' },
        { MACHINERECIPENAME: 'THIK-RCP-02', MACHINENAME: 'THK-EQ-02' },
      ],
    },
  },
  inspectionByLot: {
    'LOT-DEMO-01': {
      MACROMSG: 'Macro sample 확인',
      SCOPEMSG: 'Scope sample 확인',
      CDMSG: 'CD Point 01',
      sOvMSG: 'Overlay 확인',
      sSampleViMSG: 'Sample VI 확인',
      sSampleCdMSG: 'Sample CD Point 01',
      sSampleOvMSG: 'Sample Overlay 확인',
    },
    'LOT-BATCH-01': {
      MACROMSG: '',
      SCOPEMSG: '',
      CDMSG: 'PQC CD Point',
      sOvMSG: '',
      sSampleViMSG: '',
      sSampleCdMSG: '',
      sSampleOvMSG: '',
    },
    'LOT-DIFF-01': {
      MACROMSG: '',
      SCOPEMSG: '',
      CDMSG: '',
      sOvMSG: '',
      sSampleViMSG: '',
      sSampleCdMSG: '',
      sSampleOvMSG: '',
    },
  },
};

export const xmlFixtures = {
  floors: ['1F', '2F', '3F'],
  baysByFloor: {
    '1F': ['BAY-A01', 'BAY-A02'],
    '2F': ['BAY-B01'],
    '3F': ['BAY-C01'],
  },
};

export const dispatchingFixtures = {
  machines: {
    'ETCH-MC-01': {
      hide: [
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'N' },
        { HIDEFLAG: 'Y' },
      ],
      rows: [
        {
          NUMBER: '1',
          RESERVE: 'Y',
          JOBCODE: 'JOB-RES-01',
          LOTNAME: 'LOT-RES-01',
          PROCESSOPERATIONNAME: '1000',
          PODESC: 'PHOTO',
          QTY: '25',
          DOPANT: 'GAS-A',
          RECIPE: 'PHOTO-RCP',
          BOXSTATUS: '',
          PRODUCTSPECNAME: 'PRODUCT-DEMO',
          MAINTITEM: '',
        },
        {
          NUMBER: '2',
          RESERVE: 'N',
          JOBCODE: 'JOB-DSP-01',
          LOTNAME: 'LOT-DSP-01',
          OPREATIONNAME: '2000',
          OPREATIONDESC: 'ETCH',
          QTY: '24',
          DOPANT: 'GAS-B',
          RECIPE: 'ETCH-RCP',
          BOXSTATUS: 'INBAY',
          BAYNAME: 'BAY-A',
          PRODUCTSPECNAME: 'PRODUCT-ETCH',
          MAINTITEM: '긴급',
          REWORKSTATUS: 'InRework',
        },
        {
          NUMBER: '3',
          RESERVE: 'N',
          JOBCODE: 'JOB-DSP-02',
          LOTNAME: 'LOT-DSP-02',
          OPREATIONNAME: '3000',
          OPREATIONDESC: 'DIFF',
          QTY: '20',
          DOPANT: '',
          RECIPE: 'DIFF-RCP',
          BOXSTATUS: 'OUTBAY',
          TRANSPORT: 'OHT-02',
          PRODUCTSPECNAME: 'PRODUCT-DIFF',
          MAINTITEM: '매출',
        },
      ],
    },
  },
};
export const recipeInterlockFixtures = {
  validUdpMessage: `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-06-01T21:37:02.000+09:00</TIME>
        <COL1>val1</COL1>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <MACHINE>EQP-TEST01</MACHINE>
        <LOTID>LOT-20260601</LOTID>
        <REMOTERECIPE>RCP_REMOTE_001</REMOTERECIPE>
        <PROCESSRECIPE>RCP_PROCESS_999</PROCESSRECIPE>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`,
  matchingRecipeUdpMessage: `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-06-01T21:37:02.000+09:00</TIME>
        <COL1>val1</COL1>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <MACHINE>EQP-TEST01</MACHINE>
        <LOTID>LOT-20260601</LOTID>
        <REMOTERECIPE>RCP_MATCH_001</REMOTERECIPE>
        <PROCESSRECIPE>RCP_MATCH_001</PROCESSRECIPE>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`,
};

const APK_SIZE_BYTES = 4 * 1024 * 1024;

export const updateFixtures = {
  defaultScenario: 'success',
  file: {
    // Same relative path DownloadService.kt requests by default
    route: '/upload/hifos.apk',
    fileName: 'hifos.apk',
    contentType: 'application/vnd.android.package-archive',
  },
  scenarios: {
    // 16 chunks x 250ms = about 4s, so the client (max 1 progress event per second) reports several steps
    success: {
      status: 200,
      sizeBytes: APK_SIZE_BYTES,
      chunkBytes: 256 * 1024,
      chunkDelayMs: 250,
    },
    // About 16s, to leave time to send the app to background while downloading
    slow: {
      status: 200,
      sizeBytes: APK_SIZE_BYTES,
      chunkBytes: 128 * 1024,
      chunkDelayMs: 500,
    },
    // Content-Length 0: no progress event, download completes immediately
    empty: { status: 200, sizeBytes: 0, chunkBytes: 0, chunkDelayMs: 0 },
    // Legacy: body() is null on non-2xx, then body!! throws NPE
    notFound: { status: 404, message: 'Not Found' },
    serverError: { status: 500, message: 'Internal Server Error' },
    // Connection is cut after 1 MB (legacy: IOException)
    abort: {
      status: 200,
      sizeBytes: APK_SIZE_BYTES,
      chunkBytes: 256 * 1024,
      chunkDelayMs: 250,
      abortAfterBytes: 1024 * 1024,
    },
  },
};
export const shelfIncomingFixtures = {
  shelves: {
    '$SHELF-01': { CATEGORY: 'S', lots: [] },
    'SHELF-01': { CATEGORY: 'S', lots: [] },
    'CART-01': { CATEGORY: 'C', lots: [] },
  },
  lots: Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => {
      const id =
        index === 24
          ? 'LOT-RESERVED'
          : index === 25
            ? 'LOT-PARTIAL'
            : `LOT-${String(index + 1).padStart(2, '0')}`;
      return [
        id,
        {
          PRODUCTSPECNAME: 'PROD-DEMO',
          PROCESSOPERATIONNAME: '1200',
          OPERATIONDESCRIPTION: 'PHOTO-EXPOSURE',
          MACHINENAME: index === 24 ? 'EQP-01' : '',
          LOTRESUSER: index === 24 ? 'OPERATOR' : '',
          BAYNAME: index === 24 ? 'BAY-01' : '',
        },
      ];
    }),
  ),
};

export const impLotFixturesPatch = {
  // --- HAPPY PATH BRANCH (PORT 1 & PORT 2 SHARE THE SAME RECIPE, NO UNREAD COMMENTS) ---
  'LOT-IMP-01': {
    LOTID: 'LOT-IMP-01',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-01',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01',
    WORKEDRECIPE: 'RCP-IMP-STD-01',
    WORKEDEQPID: 'IMP-EQ-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
    COMMENTQTY: '1',
  },
  'LOT-IMP-02': {
    LOTID: 'LOT-IMP-02',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-02',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01', // Perfectly matches LOT-IMP-01
    WORKEDRECIPE: 'RCP-IMP-STD-01',
    WORKEDEQPID: 'IMP-EQ-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
    COMMENTQTY: '0',
  },

  // --- BRANCH FOR WARNING & BLOCKING UNREAD COMMENTS (NWCOMMENTQTY > 0) ---
  'LOT-IMP-CMT-01': {
    LOTID: 'LOT-IMP-CMT-01',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-03',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-STD-01',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '1',
    COMMENTQTY: '1',
  },

  // --- RECIPE BRANCH AT PORT 2---
  'LOT-IMP-DIFF-RCP': {
    LOTID: 'LOT-IMP-DIFF-RCP',
    PRODUCT: 'PROD-IMP-800',
    JOBCODE: 'JOB-IMP-04',
    QUANTITY: '20',
    RECIPE: 'RCP-IMP-OTHER-99', // Different from RCP-IMP-STD-01 -> Error message "RECIPE가 다른 LOT입니다."
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- RECIPE BRANCH INCLUDES A POPUP NOTIFICATION UPON SUCCESSFUL MEMORIZATION---
  'LOT-IMP-POPUP': {
    LOTID: 'LOT-IMP-POPUP',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-05',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-POPUP',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- RECIPE BRANCH ENCOUNTERING MEMORIZATION ERROR (START BUTTON LOCKED)---
  'LOT-IMP-MEMO-ERR': {
    LOTID: 'LOT-IMP-MEMO-ERR',
    PRODUCT: 'PROD-IMP-700',
    JOBCODE: 'JOB-IMP-06',
    QUANTITY: '25',
    RECIPE: 'RCP-IMP-MEMO-FAIL',
    OPERATION: '3100',
    SUBOPERATION: '00',
    PROCESSSTEP: 'IMP',
    OPERSEQUENCE: '001',
    OPTYPE: 'MVIN',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
    NWCOMMENTQTY: '0',
  },

  // --- LOTINFO’S OPERATIONAL ERROR CATEGORIES---
  'LOT-IMP-NOT-WIP': {
    LOTID: 'LOT-IMP-NOT-WIP',
    STATUS: 'WAIT',
    STATE: 'FIN', // Error: "FIN 상태 입니다. 자동화 진행이 불가합니다."
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-HOLD': {
    LOTID: 'LOT-IMP-HOLD',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: 'ONHOLD', // Error: "HOLD된 LOT입니다. 자동화 진행이 불가합니다."
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-BATCHED': {
    LOTID: 'LOT-IMP-BATCHED',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: 'BATCH-IMP-99', // Error: "BATCHID가 설정된 LOT입니다. 자동화 진행이 불가합니다."
    AREA: 'IMP',
    LOTRESUSER: '',
  },
  'LOT-IMP-WRONG-AREA': {
    LOTID: 'LOT-IMP-WRONG-AREA',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'PHOTO', // Error: "IMP공정이 아닙니다. LOT을 확인 후 진행 바랍니다."
    LOTRESUSER: '',
  },
  'LOT-IMP-RESERVED': {
    LOTID: 'LOT-IMP-RESERVED',
    STATUS: 'WAIT',
    STATE: 'WIP',
    HOLDSTATUS: '',
    BATCHID: '',
    AREA: 'IMP',
    LOTRESUSER: 'OP_USER_01', // Error: "이미 작업 예약되었거나 진행중인 LOT입니다."
  },
};
export const impBatchFixtures = {
  recipesByKey: {
    'LOT-IMP-01': 'RCP-IMP-STD-01',
    'LOT-IMP-02': 'RCP-IMP-STD-01',
    'LOT-IMP-CMT-01': 'RCP-IMP-STD-01',
    'LOT-IMP-DIFF-RCP': 'RCP-IMP-OTHER-99',
    'LOT-IMP-POPUP': 'RCP-IMP-POPUP',
    'LOT-IMP-MEMO-ERR': 'RCP-IMP-MEMO-FAIL',
  },
  memorizationRules: {
    'RCP-IMP-STD-01': { status: 'PASS', POPUP: '' },
    'RCP-IMP-OTHER-99': { status: 'PASS', POPUP: '' },
    'RCP-IMP-POPUP': {
      status: 'PASS',
      POPUP: '해당 RECIPE는 이온주입 각도(Tilt 7도) 사전 점검 대상입니다.',
    },
    'RCP-IMP-MEMO-FAIL': {
      status: 'FAIL',
      errorMessage: '설비에 등록되지 않은 RECIPE이거나 MEMORIZATION 검증에 실패했습니다.',
    },
    'RCP-IMP-EMPTY-ERR': {
      status: 'FAIL',
      errorMessage: 'ERRORMSG_MSGBODY',
    },
  },
  executionHistory: [],
};

export const sideDummyFixtures = {
  eqpWithLot: {
    LOTNAME: 'DMM-LOT-01',
    PROCESSOPERATIONNAME: '2000',
    PODESC: 'SIDE DUMMY ETCH',
    IN_TIME: '2026-10-22 09:30:00',
    IN_USER: 'OPER01',
  },
  eqpWithoutLot: {
    LOTNAME: '',
    PROCESSOPERATIONNAME: '1000',
    PODESC: 'SIDE DUMMY PHOTO',
    IN_TIME: '2026-10-22 10:00:00',
    IN_USER: 'OPER02',
  },
  lotInfo: {
    PROCESSOPERATIONNAME: '3000',
    PODESC: 'SIDE DUMMY DIFF',
  },
  insertSuccess: {
    RET: '정상 처리 되었습니다.',
  },
};

export const prChangeFixtures = {
  pumps: {
    'PUMP-001': {
      EQPID: 'EQP-PUMP-01',
      FAB: 'FAB1',
      PUMPNAME: 'PUMP-001',
      PRID: '1001',
      PRCOMP: 'TOK',
      PRDESC: 'TOK-PR-1001',
      FLAG: '1',
    },
    'PUMP-002': {
      EQPID: 'EQP-PUMP-02',
      FAB: 'FAB1',
      PUMPNAME: 'PUMP-002',
      PRID: '1002',
      PRCOMP: 'JSR',
      PRDESC: 'JSR-PR-1002',
      FLAG: '0',
    },
    'PUMP-003': {
      EQPID: 'EQP-PUMP-03',
      FAB: 'FAB1',
      PUMPNAME: 'PUMP-003',
      PRID: '1002',
      PRCOMP: 'JSR',
      PRDESC: 'JSR-PR-1002',
      FLAG: '1',
    },
    'PUMP-004': {
      EQPID: 'EQP-PUMP-04',
      FAB: 'FAB1',
      PUMPNAME: 'PUMP-004',
      PRID: '1003',
      PRCOMP: 'SHIN-ETSU',
      PRDESC: 'SE-PR-1003',
      FLAG: '1',
    },
  },
  prs: {
    1001: { PRID: '1001', PRCOMP: 'TOK', PRDESC: 'TOK-PR-1001' },
    1002: { PRID: '1002', PRCOMP: 'JSR', PRDESC: 'JSR-PR-1002' },
    1003: { PRID: '1003', PRCOMP: 'SHIN-ETSU', PRDESC: 'SE-PR-1003' },
  },
  changes: [],
};

/**
 * Fixtures for the PR_EMPTY (prempty) screen.
 *
 * The UDP receiver message is an XML string parsed by parseReceiverMessage()
 * in usePrempty.ts. The parser splits on <Table diffgr:id=Table1 ...> and then
 * splits each segment on '</' to extract fields by array index:
 *
 *   index 0  → TIME       (arryReceiverMessage[0], value after last '>')
 *   index 2  → ALARMLEVEL (arryReceiverMessage[2], value after last '>')
 *   index 3  → EQPID      (arryReceiverMessage[3], value after last '>')
 *   index 4  → MODEL      (arryReceiverMessage[4], value after last '>')
 *   index 5  → FACILITY   (arryReceiverMessage[5], value after last '>')
 *   index 8  → PUMPID     (arryReceiverMessage[8], value after last '>')
 *   index 9  → PUMPNAME   (arryReceiverMessage[9], value after last '>')
 *   index 10 → DESC       (arryReceiverMessage[10], value after last '>' — must contain '[…]')
 *
 * Indices 1, 6, 7 are placeholder tags (COL1..COL3) that the parser skips.
 */
export const premptyFixtures = {
  /**
   * Standard single-alarm UDP message — all fields populated.
   * Use this as the udpReceiverMessage query param when navigating to the prempty screen.
   */
  validUdpMessage: `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-10-26T09:15:30.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>2</ALARMLEVEL>
        <EQPID>EQP-PUMP-01</EQPID>
        <MODEL>MODEL-A</MODEL>
        <FACILITY>FAC-01</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-001</PUMPID>
        <PUMPNAME>MAIN PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_ALARM] Pump ready empty detected</DESC>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`,

  /**
   * Multi-alarm UDP message — two Table entries in one message.
   */
  multiAlarmUdpMessage: `<diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
  <DocumentElement xmlns="">
    <INTERLOCKMANAGER>
      <Table diffgr:id="Table1" msdata:rowOrder="0">
        <TIME>2026-10-26T09:15:30.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>2</ALARMLEVEL>
        <EQPID>EQP-PUMP-01</EQPID>
        <MODEL>MODEL-A</MODEL>
        <FACILITY>FAC-01</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-001</PUMPID>
        <PUMPNAME>MAIN PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_ALARM] Pump ready empty detected</DESC>
      </Table>
      <Table diffgr:id="Table1" msdata:rowOrder="1">
        <TIME>2026-10-26T09:16:00.000+09:00</TIME>
        <COL1>val1</COL1>
        <ALARMLEVEL>3</ALARMLEVEL>
        <EQPID>EQP-PUMP-02</EQPID>
        <MODEL>MODEL-B</MODEL>
        <FACILITY>FAC-02</FACILITY>
        <COL2>val2</COL2>
        <COL3>val3</COL3>
        <PUMPID>PUMP-002</PUMPID>
        <PUMPNAME>SUB PUMP</PUMPNAME>
        <DESC>[PR_EMPTY_WARN] Secondary pump warning</DESC>
      </Table>
    </INTERLOCKMANAGER>
  </DocumentElement>
</diffgr:diffgram>`,
};

export const machineStatusDetailFixtures = {
  eqpStatus: {
    FACILITY: 'FAB1',
    MAINSTATUS: 'RUN',
    SUBSTATUS: 'NORMAL',
    FINALWORKTIME: '2026-10-26 09:30:00',
    FDCDOWN: 'OK',
    EQPSTATUSCODE: 'R',
    EQPSTATUSDESC: '가동중',
    DOWNCODE: 'RN001',
    DOWNDESC: '정상가동',
    STATUSITEMS: {
      ITEM: [
        { EQPSTATUSCODE: 'R', EQPSTATUSDESC: '가동중' },
        { EQPSTATUSCODE: 'C', EQPSTATUSDESC: '비부하(LOAD DOWN)' },
      ],
    },
  },
  downCodeByStatus: {
    R: {
      DOWNCODEITEMS: {
        ITEM: [
          { EQPDOWNCODE: 'RN001', EQPDOWNDESC: '정상가동' },
          { EQPDOWNCODE: 'RN002', EQPDOWNDESC: '조건가동' },
        ],
      },
    },
    C: {
      DOWNCODEITEMS: {
        ITEM: [{ EQPDOWNCODE: 'CA001', EQPDOWNDESC: 'LOT 대기' }],
      },
    },
  },
  downCommentDefault: {
    DOWNCOMMENTITEMS: {
      ITEM: [{ DOWNCOMMENT: '자동 선택 코멘트' }],
    },
  },
  facilityList: {
    FABS: {
      ITEM: [{ FAB: 'FAB1' }, { FAB: 'FAB2' }, { FAB: 'FAB3' }],
    },
  },
  eqpInfo: {
    FACILITY: 'FAB1',
    MAINSTATUS: 'WAIT',
    SUBSTATUS: 'IDLE',
    FDCSTATE: 'NORMAL',
    COMMFLAG: 'ON',
    USERFLAG: 'OFF',
    CONTROLMODE: 'REMOTE',
    OPERATIONMODE: 'AUTO',
    AUTOFLAG: 'Y',
    RECIPECHECKFLAG: 'N',
    MAINCOMMENT: 'Initial clean state',
    MAINTYPE: 'WAIT',
  },
  subStatusList: {
    SUBSTATUSITEMS: {
      ITEM: [{ SUBSTATUS: 'IDLE' }, { SUBSTATUS: 'RUN' }, { SUBSTATUS: 'DOWN' }],
    },
  },
  downCommentMultiple: {
    DOWNCOMMENTITEMS: {
      ITEM: [
        { DOWNCOMMENT: '정기 점검' },
        { DOWNCOMMENT: '부품 교환' },
        { DOWNCOMMENT: 'PM 후 가동' },
      ],
    },
  },
  downCommentSingle: {
    DOWNCOMMENTITEMS: {
      ITEM: [{ DOWNCOMMENT: '정기 PM 진행' }],
    },
  },
  checkChamber: {
    RMAG: '',
    CMAG: 'Chamber 장비도 함께 변경하시겠습니까?',
    CHANGEFLAG: 'Y',
    CHAMBER: 'CH1,CH2',
  },
  checkNonLot: {
    NONLOTCHECK: 'N',
    NONLOTRESULT: 'Y',
    NONLOTMESSGE: '',
    NONLOTHMESSGE: '',
  },
  changeEqpStatus: {
    VAILOADING: '',
  },
};
export const wafercodecheckFixtures = {
  getByRunName: {
    'RUN-DEMO-01': {
      ITEMS: {
        ITEM: [{ LOTNAME: 'LOT-WAFER-01', WAFERTYPE: 'SILICON-200MM' }],
      },
      COMMNETLIST: {
        ITEM: [{ TYPEVALUE: 'NORMAL' }, { TYPEVALUE: 'MATERIAL CHANGE' }],
      },
    },
    'RUN-NG-01': {
      ITEMS: {
        ITEM: [{ LOTNAME: 'LOT-WAFER-NG-01', WAFERTYPE: 'SILICON-300MM' }],
      },
      COMMNETLIST: {
        ITEM: [{ TYPEVALUE: 'NORMAL' }],
      },
    },
    'RUN-EMPTY-01': {
      ITEMS: { ITEM: [] },
      COMMNETLIST: { ITEM: [] },
    },
  },
  errors: {
    lookup: 'RUN NAME을 찾을 수 없습니다.',
    compare: 'RUN NAME 및 WAFERTYPE을 확인하세요.',
  },
  compareSuccess: { COMPARERESULT: 'OK' },
  compareFailure: { COMPARERESULT: 'NG' },
};

export const moveInInlineFixtures = {
  info: {
    PRODUCT: 'PRODUCT-A',
    OPERATION: '1200',
    PHOTOJOBCODE: 'JOB-01',
    MASKTAG: 'MT001,MT002',
    CHANGEMASKTAG: '',
    INLINERECIPE: 'RCP-INLINE-01',
    PROCESSSTEP: 'PHOTO',
    QUANTITY: '25',
    CRITICAL_STEPPER: 'STP-01',
    CRITICAL_STEPPER2: 'STP-02',
    CRITICAL_STEPPER3: 'STP-03',
  },
  items: [
    {
      SUBPROCESSSTEP: 'COAT',
      ISCOMPLETE: 'N',
      LOCALRECIPE: 'R1',
      WORKEDEQP: '',
      IDENTCODE: 'C',
      SUBOPERATION: '01',
    },
    {
      SUBPROCESSSTEP: 'EXPOSE',
      ISCOMPLETE: 'N',
      LOCALRECIPE: 'R2',
      WORKEDEQP: '',
      IDENTCODE: 'E',
      SUBOPERATION: '02',
    },
    {
      SUBPROCESSSTEP: 'DEVELOP',
      ISCOMPLETE: 'N',
      LOCALRECIPE: 'R3',
      WORKEDEQP: '',
      IDENTCODE: 'D',
      SUBOPERATION: '03',
    },
  ],
  maskLocation: {
    PRODUCT: 'PRODUCT-A',
    GIBEN: 'G1',
    STATUS: 'IDLE',
    ISUSE: 'Y',
    CURRLOC: 'STK-01',
    SUBLOCATION3: 'A-01',
    AFTERINSP: 'Y',
  },
  set: {
    ISEXPOSURE: 'Y',
    EQPGROUP: 'EG01',
    EXPEQPGROUP: 'EXP01',
    SUBOPERATION: '02',
    COMMENTQTY: '0',
    NRWCOMMENTQTY: '0',
  },
  errors: {
    info: 'INLINE 정보를 조회할 수 없습니다.',
    mask: 'MASK 정보를 찾을 수 없습니다.',
    set: 'INLINE 설정에 실패하였습니다.',
  },
};

const esheetProcessNames = [
  'PHOTO',
  'BARC COATING',
  'PR COATING',
  'Exposure',
  'Develop',
  'DI',
  'Develop Inspector',
  'Dummy Banking',
  'Wet Etch',
  'Dry Etch',
  'Ashing',
  'Cleaning',
  'Inspection',
  'Measurement',
  'Annealing',
  'Metal Deposition',
  'Passivation',
  'Final Inspection',
  'Packing',
  'Shipping',
];

function createESheetStep(index, options = {}) {
  const processName =
    esheetProcessNames[index % esheetProcessNames.length] ?? `PROCESS ${index + 1}`;
  const operation = `${index < 10 ? 'P' : 'S'}${String(index + 1).padStart(5, '0')}`;
  const operationalActionTypes = { 7: 'HOLD', 8: 'SKIP' };

  return {
    ACTIONTYPE: options.includeOperationalStates ? (operationalActionTypes[index] ?? '') : '',
    BAY: 'BP04',
    CHANGEEQPGROUP: '',
    CHANGERECIPE: '',
    COMMENTCNT:
      options.commentIndexes?.includes(index) || (options.includeComment && index === 1)
        ? '1'
        : '0',
    CPN: 'N',
    ENDTIME: '',
    EQPGROUP: 'PHOTO',
    FUTUREACTIONDESC: index === 7 ? 'Future action required' : '',
    INOPERNAME: '',
    INQTY: '',
    ISCURRENT: index === (options.currentIndex ?? 1) ? 'Y' : 'N',
    ISDCOL: options.includeDcol && index === 1 ? 'Y' : 'N',
    ISREWORK: 'N',
    OPERATION: operation,
    OPERTYPE: operation.slice(0, 1),
    OPERSEQUENCE: String(index + 1).padStart(4, '0'),
    OUTOPERNAME: '',
    OUTQTY: '',
    PROCESSSTEP: processName,
    REALEQPID: '',
    REALRECIPE: '',
    REALRETICLE: '',
    RECIPE: processName === 'PHOTO' || processName === 'PR COATING' ? 'BEWH-K69-76-B81' : '',
    SPEC: processName === 'PHOTO' || processName === 'PR COATING' ? 'BEWH-K69-76-B81' : '',
    STARTTIME: '',
    SUBOPERATION: '00',
  };
}

function createESheetResponse(stepCount, options = {}) {
  return {
    AUTOMOTIVEFLAG: 'N',
    CUTOFF: '',
    ENGR: 'PHOTO',
    ENGR2: '',
    FACTORYNAME: 'GUMI',
    ESHEETITEMS: Array.from({ length: stepCount }, (_, index) => createESheetStep(index, options)),
    FACILITY: 'GUMI',
    GOLDENPATHEQP: '',
    HOLD_COMMENT: 'SPC OUT HOLD',
    LOTRESUSER: '',
    MAINTITEM: '',
    PHOTOJOBCODE: '20151115',
    PRIORITY: 'Normal',
    PRODUCT: 'P-DM-TEST-6F',
    PRODUCTQUANTITY: '25',
    REMAINLAYERS: '4P02-51,52,5P02-07~12,1',
    RETICLELIST: 'MASK-001',
    ROOTLOTNAME: 'ROOT-WP00001',
    PROCESSFLOWNAME: 'PHOTO-DEMO',
    SAFELAUNCHLOT: '',
    CESC: '',
    LASTLOGGEDOUTTIME: '',
    LOTPROCESSSTATE: '',
    PROCESSOPERATIONTYPE: '',
    QTIMECHECK: '',
    REWORK_BACKCOL: '',
    STATUS: 'WAIT',
    TAT: '',
  };
}

const defaultESheetResponse = createESheetResponse(esheetProcessNames.length);

function withMovedInCurrentStep(response) {
  return {
    ...response,
    ESHEETITEMS: response.ESHEETITEMS.map((step) =>
      step.ISCURRENT === 'Y'
        ? {
            ...step,
            REALEQPID: 'EQP-01',
            REALRECIPE: 'RCP-THK-01',
            STARTTIME: '2026-09-15 10:30:00',
          }
        : step,
    ),
  };
}

export const esheetFixtures = {
  infoByLot: {
    WP00001: createESheetResponse(esheetProcessNames.length, { commentIndexes: [3, 4, 5, 6, 7] }),
    'WP-COMMENT': createESheetResponse(esheetProcessNames.length, {
      includeComment: true,
      currentIndex: 0,
    }),
    'WP-EDC': createESheetResponse(esheetProcessNames.length, {
      includeDcol: true,
      currentIndex: 0,
    }),
    'WP-KEC': createESheetResponse(esheetProcessNames.length),
    'WP-OTHER': createESheetResponse(esheetProcessNames.length),
    'WP-STATUS': createESheetResponse(esheetProcessNames.length, {
      includeOperationalStates: true,
    }),
    'WP-QTIME': {
      ...defaultESheetResponse,
      CESC: 'Y',
      ENGR2: 'ENGR-SECONDARY',
      LASTLOGGEDOUTTIME: '2026-10-23 08:30',
      LOTPROCESSSTATE: 'WAIT',
      MAINTITEM: '긴급',
      PROCESSOPERATIONTYPE: 'Metrology',
      PRIORITY: 'H1',
      QTIMECHECK: 'Y',
      REWORK_BACKCOL: 'REWORK',
    },
    'WP-AUTO': {
      ...defaultESheetResponse,
      AUTOMOTIVEFLAG: 'Y',
      ENGR2: 'ENGR-SECONDARY',
      GOLDENPATHEQP: 'EQP-LIMIT-01',
      SAFELAUNCHLOT: 'WP-AUTO',
    },
    'WP-MOVEIN': withMovedInCurrentStep(defaultESheetResponse),
    'WP-LARGE': createESheetResponse(10_000),
    'WP-EMPTY': createESheetResponse(0),
    'LOT-RES-01': createESheetResponse(esheetProcessNames.length),
    'LOT-DSP-01': createESheetResponse(esheetProcessNames.length),
    'LOT-DSP-02': createESheetResponse(esheetProcessNames.length),
  },
  furnaceClassificationByLot: {
    'WP-KEC': { CNT: 'KEC' },
    'WP-OTHER': { CNT: '1' },
  },
  waferListByLot: {
    WP00001: 'WP00001.01,WP00001.02',
  },
  maskInfoByReticle: {
    'MASK-001': [
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
  },
  pcmReworkRecipeByLot: {
    WP00001: { PCMREQPLIST: 'EQP-A', RECIPELIST: 'RCP-A', PCMRESULT: 'OK' },
  },
  futureActionsByContext: {
    'WP00001|P00002|00': 'FUTURE HOLD',
  },
  photoSample: {
    RET: 'PASS',
    ALIGN: 'ALIGNED',
    GRADE: 'A',
    ETCH_RW: 'N',
    STOP: 'STOP FOR REVIEW',
  },
};

/**
 * ETCH_COMMRCPFROMB responses for the ETCH 조건표 조회 screen (ETCHActivity).
 * CHKCHK stays blank when no machine is chosen, as the server only checks a selected CHKEQPID.
 */
export const etchConditionFixtures = {
  chamberRows: [
    {
      CHAMBER: 'A',
      ETCVALUE: 'SOURCE POWER',
      BASE_VALUE: '600',
      TUNE_VALUE: '610',
      CURR_VALUE: '600',
      CHKCHK: '가능',
    },
    {
      CHAMBER: 'B',
      ETCVALUE: 'BIAS POWER',
      BASE_VALUE: '90',
      TUNE_VALUE: '95',
      CURR_VALUE: '95',
      CHKCHK: '불가',
    },
  ],
  te8500Rows: [
    { COL: 'GAP', VALUE: '0.85' },
    { COL: 'RF POWER', VALUE: '450' },
    { COL: '진행 TIME', VALUE: '45' },
  ],
  dpsPoly: {
    PROCESS_TYPE: 'DPS POLY',
    OPERDESC: '4200 DPS POLY / RCP: DP-POLY-07',
    PARA2ND: '',
    VALUE2ND: '',
    COMM2ND: '실비 조건을 확인하세요.',
    HMEEN: '',
  },
  emaxCt: {
    PROCESS_TYPE: 'eMAX CT',
    OPERDESC: '3100 eMAX CT / RCP: EM-CT-02',
    PARA2ND: 'RF',
    VALUE2ND: '650',
    COMM2ND: '',
    HMEEN: '',
  },
  te8500: {
    PROCESS_TYPE: 'TE8500',
    OPERDESC: '5200 TE8500 / RCP: TE-OX-11',
    PARA2ND: '',
    VALUE2ND: '',
    COMM2ND: '',
    HMEEN: '',
  },
};

// MultiMaskLocationActivity (activity_multi_mask_location.xml): MASKSTATUSINFO,
// MASKLOCGROUPINFO, MASKLOCATIONINFO and single-mask MASKINFO lookups.
export const multiMaskLocationFixtures = {
  // Shared by Mask Location and Multi Mask Location (same MASK*INFO messages). READY / EMPTY,
  // SHELF and BAD keep the Mask Location data; BAD is the location the change rejects.
  statuses: ['STOCK', 'INUSE', 'CLEAN', 'READY', 'EMPTY'],
  locationGroupsByStatus: {
    STOCK: ['STOCKER-A', 'STOCKER-B'],
    INUSE: ['PHOTO'],
    CLEAN: ['CLEAN-ROOM'],
    READY: ['SHELF'],
    EMPTY: [],
  },
  locationsByGroup: {
    'STOCKER-A': ['A-01', 'A-02'],
    'STOCKER-B': ['B-01'],
    PHOTO: ['EQP-01', 'EQP-02'],
    'CLEAN-ROOM': ['CR-01'],
    SHELF: ['SHELF01', 'N2BOX01', 'BAD'],
  },
  masksByReticle: {
    'RT-0001': {
      RETICLETAG: 'MASK-0001',
      PRODUCT: 'P-DM-TEST-6F',
      STATUS: 'STOCK',
      ISUSE: 'Y',
      CURRLOC: 'STOCKER-A',
    },
    'RT-0002': {
      RETICLETAG: 'MASK-0002',
      PRODUCT: 'P-DM-TEST-6F',
      STATUS: 'INUSE',
      ISUSE: 'Y',
      CURRLOC: 'PHOTO',
    },
    'RT-FAIL': {
      RETICLETAG: 'MASK-FAIL',
      PRODUCT: 'P-DM-TEST-6F',
      STATUS: 'STOCK',
      ISUSE: 'N',
      CURRLOC: 'STOCKER-B',
    },
  },
};

export const reTransferFixtures = {
  carryInfoDefault: {
    CURRENTSTK: 'STK01',
    FABS: {
      ITEM: [{ FAB: 'FAB4' }, { FAB: 'FAB5' }],
    },
    PORTS: {
      ITEM: [
        { PORT: 'OUT', PORTDESC: '출고포트 1' },
        { PORT: 'IN', PORTDESC: '입고포트 1' },
      ],
    },
  },
  carryInfoNoStk: {
    CURRENTSTK: '',
    FABS: {
      ITEM: [{ FAB: 'FAB4' }, { FAB: 'FAB5' }],
    },
    PORTS: {
      ITEM: [
        { PORT: 'OUT', PORTDESC: '출고포트 1' },
        { PORT: 'IN', PORTDESC: '입고포트 1' },
      ],
    },
  },
  fabBayInfo: {
    BAYS: {
      ITEM: [{ BAY: 'BAY01' }, { BAY: 'BAY02' }, { BAY: 'ERROR_BAY' }],
    },
  },
  bayStockerInfo: {
    STOCKERS: {
      ITEM: [{ STOCKER: 'STK01' }, { STOCKER: 'STK02' }],
    },
  },
  pdaList: {
    PDAS: {
      ITEM: [
        { PDACODE: 'PDA01', USERNAME: '홍길동', USERID: '12345' },
        { PDACODE: 'PDA02', USERNAME: '이순신', USERID: '67890' },
      ],
    },
  },
};
export const gasFixtures = {
  cabinets: {
    'GAS-CAB-01': {
      ITEMS: { ITEM: [{ CABINET: 'GAS-CAB-01', GAS: 'N2', TYPE: 'N' }] },
      PRESSURE: '5.2',
      WEIGHT: '',
      USAGES: { ITEM: [{ USAGEDATE: '2026-11-01', PRESSURE: '5.5', WEIGHT: '' }] },
    },
    'GAS-CAB-02': {
      ITEMS: { ITEM: [{ CABINET: 'GAS-CAB-02', GAS: 'SIH4', TYPE: 'Y' }] },
      PRESSURE: '3.1',
      WEIGHT: '41.7',
      USAGES: { ITEM: [{ USAGEDATE: '2026-11-01', PRESSURE: '3.4', WEIGHT: '43.0' }] },
    },
    'GAS-CAB-EMPTY': {
      ITEMS: { ITEM: [] },
      PRESSURE: '',
      WEIGHT: '',
    },
  },
  errors: {
    lookup: 'CABINET을 찾을 수 없습니다.',
    save: 'GAS 사용량을 저장할 수 없습니다.',
  },
};

/**
 * XRF Recipe Set screen fixtures.
 *
 * Hierarchy: ITEM → EQP → CATEGORY → SAMPLE → PARA → RECIPE
 *
 * Test IDs:
 *  - ITEM-XRF-01  : normal item, all dropdowns populated
 *  - ITEM-XRF-02  : item with THICK recipe (CONTEXT01='Y')
 *  - ITEM-EMPTY   : returns empty BAYS for EQP and below
 *  - ITEM-FAIL    : triggers FAIL on EQP/CATEGORY/SAMPLE/PARA/RECIPE queries
 *
 * EQPID with suffix '-THICK' causes CONTEXT01='Y' in XRFRECIPEINFO.
 *
 * 'FAB:AREA' is the default mainStore facility/area returned by the mock settings
 * provider (see main-state.mock.ts) before anyone has configured Settings, so opening
 * this screen directly (deep link / dev reload) still shows data out of the box.
 */
export const remoteXrfRecipeFixtures = {
  // XRFITEMINFO: items per facility+area
  itemsByFacilityArea: {
    'FAB1:XRF': [{ BAY: 'ITEM-XRF-01' }, { BAY: 'ITEM-XRF-02' }, { BAY: 'ITEM-EMPTY' }],
    'FAB1:DIFF': [{ BAY: 'ITEM-XRF-01' }],
    'FAB2:XRF': [{ BAY: 'ITEM-XRF-02' }],
    'FAB:AREA': [{ BAY: 'ITEM-XRF-01' }, { BAY: 'ITEM-XRF-02' }],
  },

  // XRFEQPINFO: eqps per item
  eqpsByItem: {
    'ITEM-XRF-01': [{ BAY: 'EQP-XRF-01' }, { BAY: 'EQP-XRF-02' }, { BAY: 'EQP-XRF-THICK' }],
    'ITEM-XRF-02': [{ BAY: 'EQP-XRF-02' }],
    'ITEM-EMPTY': [],
  },

  // XRFCATEGORYINFO: categories per item+eqpId
  categoriesByItemEqp: {
    'ITEM-XRF-01:EQP-XRF-01': [{ BAY: 'CAT-A' }, { BAY: 'CAT-B' }],
    'ITEM-XRF-01:EQP-XRF-02': [{ BAY: 'CAT-C' }],
    'ITEM-XRF-01:EQP-XRF-THICK': [{ BAY: 'CAT-THICK' }],
    'ITEM-XRF-02:EQP-XRF-02': [{ BAY: 'CAT-D' }],
  },

  // XRFSAMPLEINFO: samples per item+eqp+category
  samplesByItemEqpCategory: {
    'ITEM-XRF-01:EQP-XRF-01:CAT-A': [{ BAY: 'MDS-001' }, { BAY: 'MDS-002' }],
    'ITEM-XRF-01:EQP-XRF-01:CAT-B': [{ BAY: 'MDS-003' }],
    'ITEM-XRF-01:EQP-XRF-02:CAT-C': [{ BAY: 'MDS-004' }],
    'ITEM-XRF-01:EQP-XRF-THICK:CAT-THICK': [{ BAY: 'MDS-THICK-01' }],
    'ITEM-XRF-02:EQP-XRF-02:CAT-D': [{ BAY: 'MDS-005' }],
  },

  // XRFPARAINFO: para per item+eqp+category+sample
  parasByKey: {
    'ITEM-XRF-01:EQP-XRF-01:CAT-A:MDS-001': [{ BAY: 'PARA-X01' }, { BAY: 'PARA-X02' }],
    'ITEM-XRF-01:EQP-XRF-01:CAT-A:MDS-002': [{ BAY: 'PARA-X03' }],
    'ITEM-XRF-01:EQP-XRF-01:CAT-B:MDS-003': [{ BAY: 'PARA-X04' }],
    'ITEM-XRF-01:EQP-XRF-02:CAT-C:MDS-004': [{ BAY: 'PARA-X05' }],
    'ITEM-XRF-01:EQP-XRF-THICK:CAT-THICK:MDS-THICK-01': [{ BAY: 'PARA-THICK-01' }],
    'ITEM-XRF-02:EQP-XRF-02:CAT-D:MDS-005': [{ BAY: 'PARA-X06' }],
  },

  // XRFRECIPEINFO: recipe per item+eqp+category+sample+para
  // CONTEXT01='Y' → show THICK input field
  recipesByKey: {
    'ITEM-XRF-01:EQP-XRF-01:CAT-A:MDS-001:PARA-X01': { BAY: 'RCP-XRF-A01', CONTEXT01: 'N' },
    'ITEM-XRF-01:EQP-XRF-01:CAT-A:MDS-001:PARA-X02': { BAY: 'RCP-XRF-A02', CONTEXT01: 'N' },
    'ITEM-XRF-01:EQP-XRF-01:CAT-A:MDS-002:PARA-X03': { BAY: 'RCP-XRF-A03', CONTEXT01: 'N' },
    'ITEM-XRF-01:EQP-XRF-01:CAT-B:MDS-003:PARA-X04': { BAY: 'RCP-XRF-B04', CONTEXT01: 'N' },
    'ITEM-XRF-01:EQP-XRF-02:CAT-C:MDS-004:PARA-X05': { BAY: 'RCP-XRF-C05', CONTEXT01: 'N' },
    'ITEM-XRF-01:EQP-XRF-THICK:CAT-THICK:MDS-THICK-01:PARA-THICK-01': {
      BAY: 'RCP-XRF-THICK-01',
      CONTEXT01: 'Y',
    },
    'ITEM-XRF-02:EQP-XRF-02:CAT-D:MDS-005:PARA-X06': { BAY: 'RCP-XRF-D06', CONTEXT01: 'N' },
  },
};

// Abort batch around LOT-1: the 모 (parent) LOT and its 자 (child) LOT, by furnace zone.
export const manualAbortBatchFixtures = {
  rows: [
    { BATCHINFO: '모', ZONE: 'TOP', LOT: 'LOT-1' },
    { BATCHINFO: '자', ZONE: 'CENTER', LOT: 'LOT-2' },
    { BATCHINFO: '모', ZONE: 'BOTTOM', LOT: 'LOT-3' },
  ],
};
