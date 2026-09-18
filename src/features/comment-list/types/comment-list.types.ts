export interface CommentListContext {
  lotId: string;
  operation: string;
  subOperation: string;
  processStep: string;
  operSequence: string;
  facility: string;
}

export interface CommentListItem {
  no: string;
  subOperation: string;
  workCode: string;
  trackType: string;
  isCheck: boolean;
  writer: string;
  writeTime: string;
  reader: string;
  readTime: string;
  description: string;
}
