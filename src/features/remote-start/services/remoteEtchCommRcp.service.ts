import { mockEmaxCtResponse, mockTe8500Response } from '../mocks/remoteEtchCommRcp.mock';
import type {
  ApiResponse,
  EtchCommRcpRequest,
  EtchCommRcpResponseBody,
  EtchRcpDownloadRequest,
} from '../types/remoteEtchCommRcp.types';

export class RemoteEtchService {
  /**
   * Retrieve Recipe configuration parameters (Equivalent to Message ETCHCOMMRCP)
   */
  async getEtchCommRcp(params: EtchCommRcpRequest): Promise<ApiResponse<EtchCommRcpResponseBody>> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Switch the mock based on the machine name to test both business workflows.
    const isTe8500 = params.eqpId.toUpperCase().includes('TE8500');
    const responseData = isTe8500 ? mockTe8500Response : mockEmaxCtResponse;

    return {
      isSuccessFul: true,
      result: responseData,
    };
  }

  /**
   * Download recipe parameters to the device (Equivalent to Message ETCHRCPDOWNLOAD)
   */
  async downloadRecipe(_payload: EtchRcpDownloadRequest): Promise<ApiResponse<{ CHK: string }>> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Return OK to verify successful color change status
    return {
      isSuccessFul: true,
      result: {
        CHK: 'OK',
      },
    };
  }
}

export const remoteEtchService = new RemoteEtchService();
