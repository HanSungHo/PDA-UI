export interface EENSettingContext {
  lotId: string;
  factoryName: string;
  route: string;
  operation: string;
  processStep: string;
  product: string;
  facility: string;
}

export interface EENSettingItem {
  id: string;
  processOperationName: string;
  processName: string;
  factoryName: string;
  product: string;
  route: string;
  operation: string;
  poDesc: string;
  eenId: string;
  actionPoint: string;
  tagId: string;
  tagComment: string;
  modifyReason: string;
}

export interface EENSettingAddInput {
  facility: string;
  product: string;
  route: string;
  operation: string;
  poDesc: string;
  actionPoint: string;
  tagId: string;
  tagComment: string;
}

export interface EENTagOption {
  tagId: string;
  tagComment: string;
}

export interface EENModifyData {
  item: EENSettingItem;
  tagOptions: EENTagOption[];
}

export type EENModifyDataResult =
  | { success: true; data: EENModifyData }
  | { success: false; message: string };

export type EENModifyUpdateChanges = Pick<
  EENSettingItem,
  'actionPoint' | 'tagId' | 'tagComment' | 'modifyReason'
>;

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
  tagId: string;
  oldTagComment: string;
  changeCause: string;
}

export type EENModifyUpdateResult =
  | { success: true; data: EENSettingItem }
  | { success: false; message: string };

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
