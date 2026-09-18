import type { CommentListContext, CommentListItem } from '../types/comment-list.types';

export const defaultCommentListContext: CommentListContext = {
  lotId: 'LOT-A260915-018',
  operation: 'PHOTO',
  subOperation: 'INSP',
  processStep: 'Final Inspection',
  operSequence: '0042',
  facility: 'KFAB',
};

export const mockCommentItems: CommentListItem[] = [
  {
    no: '0001',
    subOperation: 'INSP',
    workCode: 'W',
    trackType: 'CURRENT',
    isCheck: false,
    writer: 'KIM HS',
    writeTime: '2026-09-15 08:12',
    reader: '',
    readTime: '',
    description: 'Check wafer edge before move-out. Hold if residue is visible on slot 18.',
  },
  {
    no: '0002',
    subOperation: 'INSP',
    workCode: 'N',
    trackType: 'LOT',
    isCheck: true,
    writer: 'LEE MJ',
    writeTime: '2026-09-15 08:28',
    reader: 'PARK DW',
    readTime: '2026-09-15 08:41',
    description: 'Recipe verified after previous chamber tuning. Continue normal inspection.',
  },
  {
    no: '0003',
    subOperation: 'ETCH',
    workCode: 'W',
    trackType: 'HISTORY',
    isCheck: false,
    writer: 'CHOI AR',
    writeTime: '2026-09-15 09:03',
    reader: '',
    readTime: '',
    description: 'Previous step reported minor particle trend. Confirm SPC note before proceed.',
  },
];
