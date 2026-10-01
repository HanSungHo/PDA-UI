import type {
  EtchInspectionExecutionRequest,
  EtchInspectionExecutionResponse,
  EtchInspectionSearchResponse,
} from '../types/etch-inspection.types';

// TODO(BE): Backend integration is pending. The service temporarily returns
// mock data instead of calling the API. Restore the axios calls below when
// the endpoints are ready.
//
// import apiClient from 'src/services/api-client';
//
// const response = await apiClient.post<EtchInspectionSearchResponse>(
//   '/etch-inspection/search',
//   { lotId },
// );
// return response.data;
//
// const response = await apiClient.post<EtchInspectionExecutionResponse>(
//   '/etch-inspection/execution',
//   payload,
// );
// return response.data;

const MOCK_LATENCY_MS = 80;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

export async function searchData(lotId: string): Promise<EtchInspectionSearchResponse> {
  await delay();

  return {
    success: true,
    data: {
      OLDPROCESSOPERATIONNAME: 'ETCH-010',
      OLDOPERATIONDESCRIPTION: 'Etch scope inspection',
      OLDMACHINENAME: 'ETCH-EQP-01',
      NOWPROCESSOPERATIONNAME: 'ETCH-020',
      NOWOPERATIONDESCRIPTION: 'Final etch inspection',
      INSPDATE: lotId === 'LOT-EXIST' ? '2026-09-29 10:30:00' : '',
      PRODUCTSPECNAME: 'PRODUCT-A',
    },
    errorMessage: '',
  };
}

export async function execution(
  payload: EtchInspectionExecutionRequest,
): Promise<EtchInspectionExecutionResponse> {
  await delay();

  return {
    success: payload.lotId !== '',
    errorMessage: payload.lotId === '' ? 'LOT ID를 입력하세요' : '',
  };
}
