import type { ROUTE } from 'src/constants/routes';

/** One XRFEQPTYPECHECK MSGBODY.ITEMS.ITEM row read by RemoteMeasMainActivity.checkEqpType. */
export interface XrfEqpTypeItem {
  MODEL: string;
  MAINEQPID: string;
}

/** RemoteAITActivity, RemoteAegisActivity and RemoteXrfActivity, opened with the Eqpid extra. */
export type RemoteMeasMainTarget =
  | typeof ROUTE.remoteAit
  | typeof ROUTE.remoteAegis
  | typeof ROUTE.remoteXrf;
