import type {
  SideDmmInsertResponse,
  SideDmmSelectEqpResponse,
  SideDmmSelectLotResponse,
} from '../types/side-dummy.types';

export const mockSideDummyEqpWithoutLot: SideDmmSelectEqpResponse = {
  LOTNAME: '',
  PROCESSOPERATIONNAME: '1000',
  PODESC: 'PHOTO OPERATION',
  IN_TIME: '2026-10-22 10:00:00',
  IN_USER: 'USER01',
};

export const mockSideDummyEqpWithLot: SideDmmSelectEqpResponse = {
  LOTNAME: 'DUMMY-LOT-01',
  PROCESSOPERATIONNAME: '2000',
  PODESC: 'ETCH OPERATION',
  IN_TIME: '2026-10-22 09:30:00',
  IN_USER: 'USER02',
};

export const mockSideDummyLotInfo: SideDmmSelectLotResponse = {
  PROCESSOPERATIONNAME: '3000',
  PODESC: 'DIFFUSION OPERATION',
};

export const mockSideDummyInsertSuccess: SideDmmInsertResponse = {
  RET: '정상 처리 되었습니다.',
};
