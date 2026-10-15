import { describe, expect, it } from 'vitest';

import { remoteEtchService } from '~/features/remote-start/services/remoteEtchCommRcp.service';

import type {
  EtchCommRcpRequest,
  EtchRcpDownloadRequest,
} from '../../../src/features/remote-start/types/remoteEtchCommRcp.types';

describe('remoteEtchCommRcp.service', () => {
  it('getEtchCommRcp: should return mock TE8500 response when eqpId contains TE8500', async () => {
    const params: EtchCommRcpRequest = {
      lotId: 'LOT_TEST',
      recipe: 'RCP_TEST',
      eqpId: 'TE8500_MCH_01',
      operId: 'OP10',
      operDesc: 'Etch',
    };

    const res = await remoteEtchService.getEtchCommRcp(params);

    expect(res.isSuccessFul).toBe(true);
    expect(res.result.PROCESS_TYPE).toBe('TE8500');
    expect(res.result.EQP_TYPE).toBe('TE8500');
    expect(res.result.COMM2ND).toBe('60 초');
  });

  it('getEtchCommRcp: should return mock eMAX CT response when eqpId does not contain TE8500', async () => {
    const params: EtchCommRcpRequest = {
      lotId: 'LOT_TEST',
      recipe: 'RCP_TEST',
      eqpId: 'EMAX_POLY_01',
      operId: 'OP20',
      operDesc: 'Poly Etch',
    };

    const res = await remoteEtchService.getEtchCommRcp(params);

    expect(res.isSuccessFul).toBe(true);
    expect(res.result.PROCESS_TYPE).toBe('eMAX CT');
    expect(res.result.STI_PROC_RCP).toBe('PROC_ETCH_REPLACED_01');
  });

  it('downloadRecipe: should return CHK = "OK" status', async () => {
    const payload: EtchRcpDownloadRequest = {
      lotId: 'LOT_TEST',
      recipe: 'RCP_TEST',
      eqpId: 'EQP_01',
      operatorId: 'OP_ADMIN',
      chamber: 'CH1',
      rmsPara: 'PARAM_A',
      downValue: '100',
      step: '1',
    };

    const res = await remoteEtchService.downloadRecipe(payload);

    expect(res.isSuccessFul).toBe(true);
    expect(res.result.CHK).toBe('OK');
  });
});
