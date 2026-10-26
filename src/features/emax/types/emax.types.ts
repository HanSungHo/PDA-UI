export interface EMaxMessageResult {
  receiverTimeResult: string;
  receiverComment: string;
  receiverTimes: string[];
}

export interface EMaxUdpPayload {
  id?: string;
  receiverMessage: string;
}
