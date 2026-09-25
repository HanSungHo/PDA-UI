import type {
  ChangeEqpStatusParams,
  ChangeEqpStatusResult,
} from 'src/types/moveout-eqp-down.types';

import { sendChangeEqpStatusApi } from './moveout-eqp-down.api';

export const moveOutEqpDownService = {
  async changeEqpStatus(params: ChangeEqpStatusParams): Promise<ChangeEqpStatusResult> {
    return sendChangeEqpStatusApi(params);
  },
};
