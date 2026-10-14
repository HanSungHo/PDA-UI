import type {
  BatchLotItem,
  RemoteFurnaceEqpInfo,
  RemoteFurnaceInterlockResult,
  RemoteFurnaceLotInfo,
  RemoteFurnacePortStatus,
} from '../types/remote-furnace.types';

export const mockRemoteFurnaceLotInfo = (_lotId: string): RemoteFurnaceLotInfo => ({
  product: 'ATOP26-W01',
  facility: 'FAB2',
  operation: '3100',
  subOperation: '010',
  recipe: 'FURNACE_DIFF_1000',
  changeRecipe: '',
  eqpGroup: 'FN01,FN02,FN03,FAB2',
  changeEqpGroup: '',
  batchId: 'BAT-FN-202610',
  area: 'DIFF',
  processStep: 'THERMAL_OXIDATION',
  opType: 'N',
  status: 'WAIT',
  state: 'WIP',
  holdStatus: '',
  operSequence: '0010',
  etcMsg: '',
  oxMachine: 'OX-STN-01',
  machineName: 'FN01',
  portName: 'PORT1',
  machineRecipeName: 'FURNACE_DIFF_1000',
  lotResUser: '',
  nwCommentQty: 1,
  processName: '',
  measType: '',
  samplingReason: '',
  samplingMsg: '',
  measOperationName: '',
  fqcLotName: '',
  ficdLot: '',
  inlineSampleMessage: '',
});

export const mockRemoteFurnaceBatchLots = (mainLotId: string): BatchLotItem[] => [
  {
    lotId: mainLotId || 'WIP00001',
    commentQty: 2,
    status: 'WAIT',
    processStep: 'THERMAL_OX',
    product: 'ATOP26-W01',
    quantity: 25,
    operation: '3100',
    subOperation: '010',
    lotState: 'WIP',
    unreadCommentQty: 1,
    operSequence: '0010',
  },
  {
    lotId: 'LOT202610-02',
    commentQty: 0,
    status: 'WAIT',
    processStep: 'THERMAL_OX',
    product: 'ATOP26-W01',
    quantity: 25,
    operation: '3100',
    subOperation: '010',
    lotState: 'WIP',
    unreadCommentQty: 0,
    operSequence: '0010',
  },
  {
    lotId: 'LOT202610-03',
    commentQty: 1,
    status: 'RUN',
    processStep: 'THERMAL_OX',
    product: 'ATOP26-W02',
    quantity: 24,
    operation: '3100',
    subOperation: '010',
    lotState: 'WIP',
    unreadCommentQty: 0,
    operSequence: '0010',
  },
  {
    lotId: 'LOT202610-04',
    commentQty: 0,
    status: 'FAIL',
    processStep: 'THERMAL_OX',
    product: 'ATOP26-W03',
    quantity: 25,
    errorMessage: 'TEMP_OVER_LIMIT',
    operation: '3100',
    subOperation: '010',
    lotState: 'WIP',
    unreadCommentQty: 0,
    operSequence: '0010',
  },
];

export const mockRemoteFurnaceEqpInfo = (eqpId: string): RemoteFurnaceEqpInfo => ({
  mainEqpId: eqpId.toUpperCase(),
  procEqpId: eqpId.toUpperCase(),
  eqpArea: 'DIFF',
  eqpType: 'FURNACE',
  pmMessage: '',
  portName: 'PORT1,PORT2,PORT3,PORT4',
  cycleMessage: '',
});

export const mockRemoteFurnacePortStatus = (portId: string): RemoteFurnacePortStatus => ({
  portState: portId === 'PORT2' ? 'RUN' : portId === 'PORT3' ? 'PENDING' : 'READY',
  portLotName: 'BAT-FN-202610',
  ackMsg: '',
});

export const mockRemoteFurnaceInterlock: RemoteFurnaceInterlockResult = {
  ret: '',
  intlk: 'N',
};

export const mockRemoteFurnaceDummyRecipes = [
  'FURNACE_NONLOT_IDLE',
  'FURNACE_STANDBY_800',
  'FURNACE_PURGE_900',
];
