import { defineStore } from 'pinia';
import { COMMON_FIELD as TEXT } from 'src/constants/common-strings';
import { DeviceInfo } from 'src/constants/device-info';
import { normalizeApiError } from 'src/services/api-error';
import { barcodeStyleLotId } from 'src/utils/barcode-style';

import {
  executeAutoMergeLot,
  getAutoMergeLot,
  getAutoMergeLot2,
} from '../services/auto-merge.service';
import type { CandidateLot, MergeLot } from '../types/auto-merge.types';

function emptyCandidate(): CandidateLot {
  return {
    LOTNAME: '',
    MAINLOTNAME: '',
    PRODUCTSPECNAME: '',
    PROCESSFLOWNAME: '',
    PROCESSOPERATIONNAME: '',
    DESCRIPTION: '',
  };
}
function emptyMergeLot(): MergeLot {
  return {
    LOTNAME: '',
    PRODUCTQUANTITY: '',
    PRODUCTSPECNAME: '',
    PROCESSFLOWNAME: '',
    PROCESSOPERATIONNAME: '',
    OPERATIONDESCRIPTION: '',
    LOTSTATE: '',
  };
}

export const useAutoMergeStore = defineStore('auto-merge', {
  state: () => ({
    editLotNo: '',
    editComment: '',
    gMainLotId: '',
    gLotList: '',
    mergeFlag: true,
    txtSelectedLot: '',
    txtProduct: '',
    txtRoute: '',
    txtProcessNum: '',
    txtProcessStep: '',
    txtParentLot: '',
    txtQty: '',
    txtProduct2: '',
    txtRoute2: '',
    txtProcessNum2: '',
    txtProcessStep2: '',
    gridList: [emptyCandidate()],
    gridList2: [emptyMergeLot()],
    gridVisible: true,
    grid2Visible: true,
    loading: false,
    returningFromLotStatus: false,
    dialogs: [] as { title: string; message: string; onConfirm?: () => void }[],
    focusRequest: { id: 0, select: false },
  }),
  actions: {
    requestFocus(select = false) {
      this.focusRequest = { id: this.focusRequest.id + 1, select };
    },
    showError(message: string, onConfirm?: () => void) {
      this.dialogs.push({
        title: TEXT.TXTDIALOGTITLE_ERROR,
        message,
        ...(onConfirm ? { onConfirm } : {}),
      });
    },
    acknowledgeDialog() {
      this.dialogs.shift()?.onConfirm?.();
    },
    clearData() {
      this.txtRoute = '';
      this.txtProcessNum = '';
      this.txtProcessStep = '';
      this.txtProduct = '';
      this.txtQty = '';
      this.editComment = '';
      this.txtRoute2 = '';
      this.txtParentLot = '';
      this.txtProcessNum2 = '';
      this.txtProduct2 = '';
      this.txtProcessStep2 = '';
      this.txtSelectedLot = '';
      this.gMainLotId = '';
      this.gLotList = '';
      // Android removeAllViews detaches the grids without changing their references.
      this.gridVisible = false;
      this.grid2Visible = false;
    },
    async handleLotEnter() {
      if (this.loading) return;
      if (!this.editLotNo.startsWith(' ')) {
        this.dialogs.push({ title: 'READING ERROR', message: 'LOT#를 읽어주세요.' });
        this.editLotNo = '';
        this.clearData();
        return;
      }
      const result = barcodeStyleLotId(this.editLotNo);
      this.editLotNo = result.parsedId;
      if (result.isValid) await this.getMergeLotInfo();
      else this.clearData();
    },
    async getMergeLotInfo() {
      if (this.loading) return;
      this.clearData();
      if (!this.editLotNo) {
        this.showError('LOT ID을 입력하세요');
        return;
      }
      this.loading = true;
      try {
        this.gridList = await getAutoMergeLot(DeviceInfo.FACILITY, this.editLotNo);
        this.gridVisible = true;
        this.gMainLotId = this.editLotNo;
        this.gLotList = this.gridList.reduce(
          (lotList, row) => (lotList ? `${lotList},${row.LOTNAME}` : row.LOTNAME),
          '',
        );
      } catch (error) {
        this.showError(normalizeApiError(error).message, () => {
          this.gMainLotId = '';
          this.editLotNo = '';
          this.requestFocus(true);
        });
      } finally {
        this.loading = false;
      }
    },
    async selectLotList(row: CandidateLot) {
      if (this.loading) return;
      this.txtSelectedLot = row.LOTNAME;
      this.txtProduct = row.PRODUCTSPECNAME;
      this.txtRoute = row.PROCESSFLOWNAME;
      this.txtProcessNum = row.PROCESSOPERATIONNAME;
      this.txtProcessStep = row.DESCRIPTION;
      await this.getLotInfo(row.LOTNAME, row.MAINLOTNAME);
    },
    isMismatch(row: MergeLot): boolean {
      return (
        row.PROCESSFLOWNAME !== this.txtRoute ||
        row.PROCESSOPERATIONNAME !== this.txtProcessNum ||
        row.PROCESSOPERATIONNAME !== this.txtProcessNum2
      );
    },
    async getLotInfo(sLotId: string, sParentLotId: string) {
      if (this.loading) return;
      this.mergeFlag = true;
      this.grid2Visible = false;
      this.loading = true;
      try {
        const info = await getAutoMergeLot2(sLotId, sParentLotId, this.gLotList);
        this.txtParentLot = info.PARENTLOTNAME;
        this.txtQty = info.PARENTQTY;
        this.txtProduct2 = info.PARENTPRODUCTSPECNAME;
        this.txtRoute2 = info.PARENTPROCESSFLOWNAME;
        this.txtProcessNum2 = info.PARENTOPERATION;
        this.txtProcessStep2 = info.PARENTDESCRIPTION;
        this.gridList2 = info.ITEMS;
        this.mergeFlag = !this.gridList2.some((row) => this.isMismatch(row));
        this.grid2Visible = true;
      } catch (error) {
        this.showError(normalizeApiError(error).message);
      } finally {
        this.loading = false;
      }
    },
    async executeMerge() {
      if (this.loading) return;
      if (!this.mergeFlag) {
        this.showError(
          '선택된 LOT이 모두 AUTO MERGE와 같은 ROUTE, 공정이어야 작업진행이 가능합니다.',
        );
        return;
      }
      const arrMergeLot = this.gridList2
        .map((row) => `${row.LOTNAME} ${row.PRODUCTQUANTITY}`)
        .join(',');
      if (!arrMergeLot.trim() || !this.txtSelectedLot || !this.txtParentLot) {
        this.showError('Merge할 Lot이 없습니다.');
        return;
      }
      if (!this.editLotNo) {
        this.showError('LOT ID을 입력하세요');
        return;
      }
      this.loading = true;
      try {
        const result = await executeAutoMergeLot({
          FACTORYNAME: DeviceInfo.FACILITY,
          LOTNAME: this.gMainLotId,
          PARENTLOTNAME: this.txtParentLot,
          PRODUCTSPECNAME: this.txtProduct,
          ROUTE: this.txtRoute,
          PROCESSOPERATIONNAME: this.txtProcessNum,
          QTY: this.txtQty,
          OPERATORID: DeviceInfo.OPERATOR_ID,
          COMMENT: this.editComment,
          MERGELOT: arrMergeLot,
        });
        if (result.FAILLOTNAME) this.showError(result.FAILLOTNAME);
        if (result.SUCCESS === 'Y') {
          this.dialogs.push({
            title: TEXT.TXTDIALOGTITLE_OK,
            message: '작업을 수행하였습니다.',
            onConfirm: () => {
              this.clearData();
              this.editLotNo = '';
              this.requestFocus();
            },
          });
        }
      } catch (error) {
        this.showError(normalizeApiError(error).message, () => this.requestFocus(true));
      } finally {
        this.loading = false;
      }
    },
  },
});
