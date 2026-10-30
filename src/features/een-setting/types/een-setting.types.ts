export interface EENSettingContext {
  lotId: string;
  factoryName: string;
  route: string;
  operation: string;
  processStep: string;
  product: string;
  facility: string;
}

/** One GETEENLIST row (EENSettingActivity grid). */
export interface EENSettingItem {
  id: string;
  processOperationName: string;
  /** PROCESSOPERATIONNAMEDESC, shown as 공정명. */
  processName: string;
  factoryName: string;
  product: string;
  route: string;
  operation: string;
  /** DESCRIPTION, passed to Modify / Delete as PODESC. */
  poDesc: string;
  eenId: string;
  actionPoint: string;
  tagId: string;
  tagComment: string;
  createTime: string;
  createUser: string;
  confirmUser: string;
  confirmTime: string;
}

export interface EENTagOption {
  tagId: string;
  tagComment: string;
}

export interface EENModifyUpdateRequest {
  lotId: string;
  userId: string;
  facility: string;
  product: string;
  operation: string;
  actionPoint: EENSettingItem['actionPoint'];
  eenId: string;
  processFlow: string;
  tagComment: string;
  tagId: string | null;
  oldTagComment: string;
  changeCause: string;
}

export type EENModifyUpdateResult = { success: true } | { success: false; message: string };

export interface DeleteEENRequest {
  lotId: string;
  userId: string;
  facility: string;
  product: string;
  operation: string;
  actionPoint: string;
  eenId: string;
  route: string;
  comment: string;
  tagId: string;
  deleteReason: string;
}

export type DeleteEENResult = { success: true } | { success: false; errorMessage: string };

export type EENSettingChildAction = 'add' | 'modify' | 'delete';
