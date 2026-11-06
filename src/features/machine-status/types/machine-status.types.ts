export interface MachineStatusBayItem {
  BAY: string;
}

export interface MachineStatusEqpItem {
  EQPID: string;
  EQPSTATUS: string;
  EQPDESCRIPTION: string;
  EQPTYPE: string;
}

/** Server list container: `{ ITEM: [...] }`, where a single row may arrive as an object. */
export interface MachineStatusItemList<T> {
  ITEM?: T | T[];
}

export interface MachineStatusAreaBayInfoBody {
  BAYS?: MachineStatusItemList<MachineStatusBayItem>;
}

export interface MachineStatusBayEqpInfoBody {
  EQPITEMS?: MachineStatusItemList<MachineStatusEqpItem>;
}

export type MachineStatusApiResult<T> = { ok: true; data: T } | { ok: false; message: string };
