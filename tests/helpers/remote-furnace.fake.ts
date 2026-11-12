// Test data and a service stub for Remote Furnace specs. The app reads this data from the mock server.
import type { remoteFurnaceService } from 'src/features/remote-furnace/services/remote-furnace.service';
import type {
  BatchLotItem,
  RemoteFurnaceEqpInfo,
  RemoteFurnaceInterlockResult,
  RemoteFurnaceLotInfo,
  RemoteFurnacePortStatus,
} from 'src/features/remote-furnace/types/remote-furnace.types';
import type { vi } from 'vitest';

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

type FurnaceService = typeof remoteFurnaceService;

/** Stubs every Remote Furnace service call with the sample data above (the former mock mode). */
export function stubRemoteFurnaceService(service: FurnaceService, spyOn: typeof vi.spyOn): void {
  spyOn(service, 'fetchLotInfo').mockImplementation((lotId: string) =>
    Promise.resolve({ ok: true, data: mockRemoteFurnaceLotInfo(lotId) }),
  );
  spyOn(service, 'fetchBatchListByLot').mockImplementation((lotId: string) => {
    const empty = lotId.toUpperCase().includes('EMPTY');
    return Promise.resolve({
      ok: true,
      data: {
        items: empty ? [] : mockRemoteFurnaceBatchLots(lotId),
        unreadCommentQty: empty ? 0 : 1,
      },
    });
  });
  spyOn(service, 'fetchRemoteEqpInfo').mockImplementation((eqpId: string) =>
    Promise.resolve({ ok: true, data: mockRemoteFurnaceEqpInfo(eqpId) }),
  );
  spyOn(service, 'changeEquipmentStatus').mockResolvedValue({ ok: true, data: null });
  spyOn(service, 'fetchRecipeInfo').mockResolvedValue({
    ok: true,
    data: { recipe: 'FURNACE_DIFF_1000', etchMessage: '', multiMoveInAction: '' },
  });
  spyOn(service, 'fetchDummyRecipeInfo').mockResolvedValue({
    ok: true,
    data: mockRemoteFurnaceDummyRecipes,
  });
  spyOn(service, 'fetchMachinePortStatus').mockImplementation((_eqp: string, portId: string) =>
    Promise.resolve({ ok: true, data: mockRemoteFurnacePortStatus(portId) }),
  );
  spyOn(service, 'clearMachinePort').mockResolvedValue({ ok: true, data: null });
  spyOn(service, 'checkFurnaceInterlock').mockResolvedValue({
    ok: true,
    data: mockRemoteFurnaceInterlock,
  });
  spyOn(service, 'checkLotComment').mockResolvedValue({ ok: true, data: 0 });
  spyOn(service, 'startRemoteFurnace').mockResolvedValue({ ok: true, data: null });
}
