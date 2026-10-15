import { computed, reactive, ref } from 'vue';

import type { BaseRevoGridColumn } from '~/components/base';
import { useMainStore } from '~/features/main';

import { remoteEtchService } from '../services/remoteEtchCommRcp.service';
import type {
  CommRcpRawItem,
  DialogState,
  EtchCommRcpResponseBody,
  GridRowItem,
  RemoteEtchInboundParams,
} from '../types/remoteEtchCommRcp.types';

export function useRemoteEtchCommRcp(initialParams?: RemoteEtchInboundParams) {
  const mainStore = useMainStore();

  // C parameters
  const receiveLotId = ref(initialParams?.LOTID || '');
  const receiveRecipe = ref(initialParams?.RECIPE || '');
  const receiveEqpId = ref(initialParams?.EQPID || '');
  const receiveOperID = ref(initialParams?.OPERID || '');
  const receiveOperDesc = ref(initialParams?.OPERDESC || '');

  // Status received from the server
  const receiveEQP_TYPE = ref('');
  const ownerCode = ref('');
  const ownerText = ref('');
  const processType = ref('');
  const canDownload = ref(true);

  // Grid Data & Columns
  const gridRows = ref<GridRowItem[]>([]);
  const gridColumns = ref<BaseRevoGridColumn[]>([]);

  // Loading flags
  const isLoading = ref(false);
  const isExecuting = ref(false);

  // Dialog State
  const dialogState = reactive<DialogState>({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  const confirmState = reactive<DialogState>({
    open: false,
    title: '',
    message: '',
    type: 'confirm',
  });

  const titleText = computed(() => `RCP 조건 ( ${ownerCode.value ?? ''} )`);

  function showAlert(title: string, message: string, type: 'info' | 'error' = 'info') {
    dialogState.title = title;
    dialogState.message = message;
    dialogState.type = type;
    dialogState.open = true;
  }

  function closeAlert() {
    dialogState.open = false;
  }

  // 1:1 Mapping: setData()
  async function setData() {
    isLoading.value = true;
    try {
      const response = await remoteEtchService.getEtchCommRcp({
        lotId: receiveLotId.value,
        recipe: receiveRecipe.value,
        eqpId: receiveEqpId.value,
        operId: receiveOperID.value,
        operDesc: receiveOperDesc.value,
      });

      if (!response.isSuccessFul) {
        showAlert('에러', response.errorMessage || 'Server connection error', 'error');
        canDownload.value = false;
        return;
      }

      const body: EtchCommRcpResponseBody = response.result;
      const downLoad = body.DOWNLOAD || 'N';
      processType.value = body.PROCESS_TYPE || '';
      const sampleChk = body.SAMPLE_CHK || '';
      ownerCode.value = body.OWNERCODE || '';
      const rawCommRcp = body.COMMRCP || [];

      const s2NDPara = body.PARA2ND || '';
      const s2NDValue = body.VALUE2ND || '';
      const s2NDCOMM = body.COMM2ND || '';

      // Rule #1: STI Recipe Replacement (sSTI_PROC_RCP override)
      if (body.STI_PROC_RCP && body.STI_PROC_RCP.trim().length > 0) {
        receiveRecipe.value = body.STI_PROC_RCP;
      }

      receiveEQP_TYPE.value = body.EQP_TYPE || '';

      // Handle text displayed in the Owner Box
      if (!s2NDCOMM) {
        if (s2NDPara) {
          ownerText.value = `${s2NDPara} : ${s2NDValue} 추가 반영`;
        }
      } else {
        ownerText.value = s2NDCOMM;
      }

      // Download Flag
      canDownload.value = downLoad !== 'N';

      // Rule #8: Sample Warning Popup
      if (sampleChk && sampleChk.trim().length > 0) {
        showAlert('알림', sampleChk, 'info');
      }

      // Construct columns and filter data based on PROCESS_TYPE
      setupGridData(processType.value, rawCommRcp, downLoad);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Server connection error';
      showAlert('에러', errMsg, 'error');
      canDownload.value = false;
    } finally {
      isLoading.value = false;
    }
  }

  function setupGridData(type: string, rawList: CommRcpRawItem[], downLoad: string) {
    if (type === 'eMAX CT' || type === 'DPS POLY') {
      gridColumns.value = [
        { prop: 'CHAMBER', name: 'CH', size: 90, align: 'center' },
        { prop: 'ETCVALUE', name: 'PARA', size: 110, align: 'center' },
        { prop: 'BASE_VALUE', name: 'BASE', size: 95, align: 'center' },
        {
          prop: 'TUNE_VALUE',
          name: '변경',
          size: 95,
          align: 'center',
          cellProperties: () => ({ class: 'rcp-cell--tune' }),
        },
        { prop: 'STEP', name: 'STEP', size: 70, align: 'center' },
        { prop: 'RMS_PARANAME', name: 'RMS_NAME', size: 0, visible: false },
        {
          prop: 'RESULT',
          name: '결과',
          size: downLoad === 'Y' ? 100 : 0,
          align: 'center',
        },
      ];

      gridRows.value = rawList.map((item, index) => ({
        id: index + 1,
        CHAMBER: item.CHAMBER || '',
        ETCVALUE: item.ETCVALUE || '',
        BASE_VALUE: item.BASE_VALUE || '',
        TUNE_VALUE: item.TUNE_VALUE || '',
        STEP: item.STEP || '',
        RMS_PARANAME: item.RMS_PARANAME || '',
        COL: '',
        VALUE: '',
        RESULT: item.RESULT || '',
      }));
    } else if (type === 'TE8500') {
      gridColumns.value = [
        {
          prop: 'COL',
          name: 'COL',
          size: 160,
          align: 'center',
          cellProperties: () => ({ class: 'rcp-cell--tune' }),
        },
        { prop: 'VALUE', name: 'VALUE', size: 150, align: 'center' },
        { prop: 'RESULT', name: 'RESULT', size: 150, align: 'center' },
      ];

      // Rule #5: TE8500 Filter – remove rows where VALUE == "-"
      gridRows.value = rawList
        .filter((item) => String(item.VALUE).trim() !== '-')
        .map((item, index) => ({
          id: index + 1,
          CHAMBER: '',
          ETCVALUE: '',
          BASE_VALUE: '',
          TUNE_VALUE: '',
          STEP: '',
          RMS_PARANAME: '',
          COL: item.COL || '',
          VALUE: item.VALUE || '',
          RESULT: item.RESULT || '',
        }));
    }
  }

  // 1:1 Mapping: executeModify()
  function executeModify() {
    confirmState.title = 'Recipe 변경';
    confirmState.message = 'Recipe를 변경하시겠습니까?';
    confirmState.open = true;
    confirmState.onConfirm = async () => {
      confirmState.open = false;
      await runModificationProcess();
    };
  }

  async function runModificationProcess() {
    isExecuting.value = true;
    try {
      // Branch 1: Rule #2: TE8500 Device
      if (receiveEQP_TYPE.value === 'TE8500') {
        const downValue = ownerText.value.replace(' 초', '').trim();

        const res = await remoteEtchService.downloadRecipe({
          lotId: receiveLotId.value,
          recipe: receiveRecipe.value,
          eqpId: receiveEqpId.value,
          operatorId: mainStore.operatorId,
          chamber: receiveEQP_TYPE.value,
          rmsPara: 'TIME',
          downValue: downValue,
          step: '2',
        });

        if (res.isSuccessFul) {
          const status = res.result.CHK;
          gridRows.value = gridRows.value.map((row) => {
            if (row.COL === '진행 TIME') {
              return applyResultStatus(row, status);
            }
            return row;
          });
        } else {
          showAlert('에러', res.errorMessage || 'Update error Recipe TE8500', 'error');
        }
      } else {
        // Branch 2: Rule #3: STEP Batching logic for eMAX / DPS POLY
        let rmsPara = '';
        let downValue = '';
        const rows = [...gridRows.value];

        for (let i = 0; i < rows.length; i++) {
          const currentRow = rows[i];
          const tuneValue = currentRow.TUNE_VALUE?.trim();

          // Skip if TUNE_VALUE is empty or already "정상" (Rule #4)
          if (!tuneValue || currentRow.RESULT === '정상') {
            continue;
          }

          // Check if the next line has the same STEP to concatenate the string using the "@" character.
          if (i !== rows.length - 1) {
            const nextRow = rows[i + 1];
            if (currentRow.STEP === nextRow.STEP && nextRow.RESULT !== '정상') {
              rmsPara += `${currentRow.RMS_PARANAME}@`;
              downValue += `${tuneValue}@`;
              continue;
            }
          }

          rmsPara += currentRow.RMS_PARANAME;
          downValue += tuneValue;

          const currentChm = currentRow.CHAMBER;
          const currentStep = currentRow.STEP;

          await executeStepDownload(currentChm, rmsPara, downValue, currentStep);

          rmsPara = '';
          downValue = '';
        }
      }
    } finally {
      isExecuting.value = false;
    }
  }

  // 1:1 Mapping: execute()
  async function executeStepDownload(chamber: string, rms: string, values: string, step: string) {
    const res = await remoteEtchService.downloadRecipe({
      lotId: receiveLotId.value,
      recipe: receiveRecipe.value,
      eqpId: receiveEqpId.value,
      operatorId: mainStore.operatorId,
      chamber: chamber,
      rmsPara: rms,
      downValue: values,
      step: step,
    });

    if (res.isSuccessFul) {
      const status = res.result.CHK;
      gridRows.value = gridRows.value.map((row) => {
        if (
          row.CHAMBER === chamber &&
          row.STEP === step &&
          row.TUNE_VALUE &&
          row.RESULT !== '정상'
        ) {
          return applyResultStatus(row, status);
        }
        return row;
      });
    } else {
      showAlert('에러', res.errorMessage || `Error loading  Recipe Step ${step}`, 'error');
    }
  }

  // Rule #6: UI Color & Text Status Mapping
  function applyResultStatus(row: GridRowItem, chk: string): GridRowItem {
    let resultText = '';
    let bgColor = '';

    switch (chk) {
      case 'OK':
        resultText = '정상';
        bgColor = '#b30000e1'; // blue
        break;
      case 'D_FAIL':
        resultText = '변경실패';
        bgColor = '#b3ff0000'; // red
        break;
      case 'V_FAIL':
        resultText = '검증실패';
        bgColor = '#b3ff0000'; // red
        break;
      default:
        resultText = chk;
        bgColor = 'transparent';
    }

    return {
      ...row,
      RESULT: resultText,
      resultBgColor: bgColor,
      resultTextColor: '#FFFFFF',
    };
  }

  return {
    receiveLotId,
    receiveRecipe,
    receiveEqpId,
    ownerText,
    titleText,
    canDownload,
    processType,
    gridRows,
    gridColumns,
    isLoading,
    isExecuting,
    dialogState,
    confirmState,
    setData,
    executeModify,
    closeAlert,
  };
}
