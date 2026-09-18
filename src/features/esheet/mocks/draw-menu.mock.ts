import {
  DRAW_MENU_ACTION_ID,
  type DrawMenuListProps,
  LOT_STATUS,
} from '../components/draw-menu-list';

export const drawMenuPreviewProps: DrawMenuListProps = {
  open: false,
  title: 'CONT CD',
  lotId: 'WIP00001',
  factoryName: 'HF',
  productName: 'PRODUCT-A',
  routeName: 'ROUTE-A',
  area: 'PHOTO',
  selectedAction: DRAW_MENU_ACTION_ID.lotStatus,
  row: {
    ISCURRENT: 'N',
    OPERATION: '10001',
    SUBOPERATION: '010',
    PROCESSSTEP: 'CONT CD',
    OPERSEQUENCE: '20',
    COMMENTCNT: '1',
    ENDTIME: '',
    LOT_STATUS: LOT_STATUS.wait,
  },
};
