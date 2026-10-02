import * as moveOutApi from 'src/features/move-out/services/moveout-eqp-down.api';
import { moveOutEqpDownService } from 'src/features/move-out/services/moveout-eqp-down.service';
import apiClient from 'src/services/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('moveOutEqpDownService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates changeEqpStatus to sendChangeEqpStatusApi', async () => {
    const spy = vi.spyOn(moveOutApi, 'sendChangeEqpStatusApi').mockResolvedValueOnce({
      success: true,
      message: 'OK',
    });

    const params = {
      machine: 'PHOTO-01',
      chamberList: ['CH-1'],
      mainFlag: 'Y' as const,
    };

    const res = await moveOutEqpDownService.changeEqpStatus(params);

    expect(spy).toHaveBeenCalledWith(params);
    expect(res.success).toBe(true);
  });
});

describe('sendChangeEqpStatusApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts CHANGEEQPSTATUS with the legacy XML body contract', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: `<BODY>
<RESULT>SUCCESS</RESULT>
</BODY>`,
    });

    await moveOutApi.sendChangeEqpStatusApi({
      machine: 'PHOTO-01',
      facility: 'FACILITY',
      chamberList: ['CH-1', 'CH-2'],
      mainFlag: 'N',
      operatorId: 'OPERATOR_ID',
      operatorName: 'OPERATOR_NAME',
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/hifos/changeeqpstatus',
      `<BODY>
<EQPID>PHOTO-01</EQPID>
<FACILITY>FACILITY</FACILITY>
<EQPSTATUSCODE>C  비부하(LOAD DOWN)</EQPSTATUSCODE>
<EQPDOWNCODE>CA001</EQPDOWNCODE>
<COMMENT>PDA_MVOUT_DOWN</COMMENT>
<LOGINUSERID>OPERATOR_ID</LOGINUSERID>
<LOGINGUSERID1>OPERATOR_NAME</LOGINGUSERID1>
<CHANGECHAMBER>CH-1,CH-2</CHANGECHAMBER>
<MAINFLAG>N</MAINFLAG>
</BODY>`,
      {
        headers: {
          'Content-Type': 'application/xml',
          Accept: 'application/xml, text/xml, */*',
        },
        responseType: 'text',
      },
    );
  });
});
