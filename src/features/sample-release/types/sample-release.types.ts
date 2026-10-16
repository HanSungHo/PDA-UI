export interface SampleReleaseInfoItem {
  SLOTNAME: string;
  SQTY: string;
  SPROD: string;
  SOPER: string;
  SOPERDESC: string;
  SPROCESS: string;
  RPROD: string;
  RPROCESS: string;
  ROPER: string;
  RMACHINENAME: string;
  MLOTNAME: string;
  MQTY: string;
  MPROD: string;
  MPROCESS: string;
  MOPER: string;
  MOPERDESC: string;
  MPROCESSSTATE: string;
}

export interface SampleReleaseExecutionPayload {
  facility: string;
  sampleLot: string;
  machine: string;
  sampleQty: string;
  route: string;
  operation: string;
  userId: string;
  comment: string;
  mainLotName: string;
  mainQty: string;
}

export interface SampleReleaseResponse<T = Record<string, unknown>> {
  isSuccessFul: boolean;
  result: T;
  errorMessage?: string;
}

export interface SampleReleaseService {
  getSampleReleaseInfo(
    lotId: string,
  ): Promise<SampleReleaseResponse<{ ITEMS: SampleReleaseInfoItem[] }>>;
  executeSampleRelease(
    payload: SampleReleaseExecutionPayload,
  ): Promise<SampleReleaseResponse<{ SUCESSMSG?: string }>>;
}
