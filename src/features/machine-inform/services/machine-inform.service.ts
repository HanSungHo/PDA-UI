import { postAifMessage } from 'src/services/aif-message.service';

export type MachineInformType = 'MACHINE' | 'PROCESS';
export interface MachineInformRequest {
  factoryName: string;
  type: MachineInformType;
  machineName: string;
}
export interface AddMachineInformRequest extends MachineInformRequest {
  content: string;
  userId: string;
}

function readInformResponse(response: { statusCode: number; result: string }): string {
  if (response.statusCode !== 200) throw new Error(response.result || 'Server error');
  const data = JSON.parse(response.result) as {
    STATUS?: string;
    ERRMSG?: string;
    MSGBODY?: { INFORM_CONTENT?: string };
  };
  if (data.STATUS !== 'PASS') throw new Error(data.ERRMSG || 'Server error');
  return data.MSGBODY?.INFORM_CONTENT ?? '';
}

export const machineInformService = {
  async getMachineInform({
    factoryName,
    type,
    machineName,
  }: MachineInformRequest): Promise<string> {
    return readInformResponse(
      await postAifMessage('GETMACHINEINFORM', 'GETMACHINEINFORM', [
        ['FACTORYNAME', factoryName],
        ['TYPE', type],
        ['MACHINENAME', machineName],
      ]),
    );
  },
  async addMachineInform({
    factoryName,
    type,
    machineName,
    content,
    userId,
  }: AddMachineInformRequest): Promise<string> {
    return readInformResponse(
      await postAifMessage('ADDMACHINEINFORM', 'ADDMACHINEINFORM', [
        ['FACTORYNAME', factoryName],
        ['TYPE', type],
        ['MACHINENAME', machineName],
        ['CONTENT', content],
        ['USERID', userId],
      ]),
    );
  },
};
