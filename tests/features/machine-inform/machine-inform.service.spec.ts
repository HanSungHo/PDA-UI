import { createPinia, setActivePinia } from 'pinia';
import { machineInformService } from 'src/features/machine-inform/services/machine-inform.service';
import { postAifMessage } from 'src/services/aif-message.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('src/services/aif-message.service', () => ({ postAifMessage: vi.fn() }));

describe('machineInformService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('sends the original GETMACHINEINFORM fields and reads INFORM_CONTENT', async () => {
    vi.mocked(postAifMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS', MSGBODY: { INFORM_CONTENT: 'memo' } }),
    });
    await expect(
      machineInformService.getMachineInform({
        factoryName: 'FAB1',
        type: 'MACHINE',
        machineName: 'EQP-1',
      }),
    ).resolves.toBe('memo');
    expect(postAifMessage).toHaveBeenCalledWith('GETMACHINEINFORM', 'GETMACHINEINFORM', [
      ['FACTORYNAME', 'FAB1'],
      ['TYPE', 'MACHINE'],
      ['MACHINENAME', 'EQP-1'],
    ]);
  });

  it('sends the original ADDMACHINEINFORM fields and surfaces server errors', async () => {
    vi.mocked(postAifMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'FAIL', ERRMSG: 'Denied' }),
    });
    await expect(
      machineInformService.addMachineInform({
        factoryName: 'FAB1',
        type: 'PROCESS',
        machineName: 'EQP-1',
        content: 'memo',
        userId: 'OP1',
      }),
    ).rejects.toThrow('Denied');
    expect(postAifMessage).toHaveBeenCalledWith('ADDMACHINEINFORM', 'ADDMACHINEINFORM', [
      ['FACTORYNAME', 'FAB1'],
      ['TYPE', 'PROCESS'],
      ['MACHINENAME', 'EQP-1'],
      ['CONTENT', 'memo'],
      ['USERID', 'OP1'],
    ]);
  });

  it.each([
    [{ statusCode: 500, result: 'Boom' }, 'Boom'],
    [{ statusCode: 500, result: '' }, 'Server error'],
    [{ statusCode: 200, result: JSON.stringify({ STATUS: 'FAIL' }) }, 'Server error'],
  ])('throws for a failed response %#', async (response, message) => {
    vi.mocked(postAifMessage).mockResolvedValue(response);
    await expect(
      machineInformService.getMachineInform({
        factoryName: 'FAB1',
        type: 'MACHINE',
        machineName: 'EQP-1',
      }),
    ).rejects.toThrow(message);
  });

  it('returns an empty string when INFORM_CONTENT is missing', async () => {
    vi.mocked(postAifMessage).mockResolvedValue({
      statusCode: 200,
      result: JSON.stringify({ STATUS: 'PASS' }),
    });
    await expect(
      machineInformService.getMachineInform({
        factoryName: 'FAB1',
        type: 'MACHINE',
        machineName: 'EQP-1',
      }),
    ).resolves.toBe('');
  });
});
