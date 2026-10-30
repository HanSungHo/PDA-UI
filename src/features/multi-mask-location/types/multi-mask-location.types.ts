/** One scanned mask row, in the column order of the Android grid. */
export interface MultiMaskRow {
  /** Row identity for the grid; Android allows the same mask to be scanned twice. */
  id: number;
  MASKTAG: string;
  ISUSE: string;
  STATUS: string;
  CURRLOC: string;
  PRODUCT: string;
  /** Scanned value without the scanner terminator; sent as RETICLEID on change. */
  MASKID: string;
}

export type MultiMaskInfo = Omit<MultiMaskRow, 'id' | 'MASKID'>;

/** Location selection sent with every CHANGEMASKLOCATION request. */
export interface MultiMaskLocationTarget {
  status: string;
  location: string;
  detailLocation: string;
  floor: string;
}

export interface MultiMaskDialog {
  title: string;
  message: string;
}
