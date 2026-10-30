export interface MachineStatusDetailApiResult<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export interface EqpStatusItem {
  EQPSTATUSCODE?: string;
  EQPSTATUSDESC?: string;
}

export interface EqpStatusResponse {
  FACILITY?: string;
  MAINSTATUS?: string;
  SUBSTATUS?: string;
  FINALWORKTIME?: string;
  FDCDOWN?: string;
  EQPSTATUSCODE?: string;
  EQPSTATUSDESC?: string;
  DOWNCODE?: string;
  DOWNDESC?: string;
  STATUSITEMS?: { ITEM?: EqpStatusItem | EqpStatusItem[] } | EqpStatusItem[];
}

export interface EqpDownCodeItem {
  EQPDOWNCODE?: string;
  EQPDOWNDESC?: string;
}

export interface EqpDownCodeResponse {
  DOWNCODEITEMS?: { ITEM?: EqpDownCodeItem | EqpDownCodeItem[] } | EqpDownCodeItem[];
}

export interface EqpDownCommentItem {
  DOWNCOMMENT?: string;
}

export interface EqpDownCommentResponse {
  DOWNCOMMENTITEMS?: { ITEM?: EqpDownCommentItem | EqpDownCommentItem[] } | EqpDownCommentItem[];
}

export interface CheckChamberResponse {
  RMAG?: string;
  CMAG?: string;
  CHANGEFLAG?: string;
  CHAMBER?: string;
}

export interface CheckNonLotPayload {
  eqpId: string;
  facility: string;
  finalTime: string;
  operatorId: string;
  downCode: string;
}

export interface CheckNonLotResponse {
  NONLOTCHECK?: string;
  NONLOTRESULT?: string;
  NONLOTMESSGE?: string;
  NONLOTHMESSGE?: string;
}

export interface ChangeEqpStatusPayload {
  eqpId: string;
  facility: string;
  eqpStatusCode: string;
  eqpDownCode: string;
  comment: string;
  operatorId: string;
  operatorName: string;
  changeChamber: string;
}

export interface ChangeEqpStatusResponse {
  VAILOADING?: string;
}

export interface MachineStatusDetailAlertDialog {
  open: boolean;
  title: string;
  message: string;
}

export interface MachineStatusDetailConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm?: (() => void | Promise<void>) | undefined;
  onCancel?: (() => void | Promise<void>) | undefined;
}
