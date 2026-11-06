import { COMMON_FIELD } from 'src/constants/common-strings';
import { okDialog } from 'src/services/ok-dialog.service';
import { barcodeStyleEqpId } from 'src/utils/barcode-style';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { testTuningService } from '../services/test-tuning.service';
import type {
  DropdownItem,
  GridRowData,
  RevoGridColumn,
  ScreenMode,
} from '../types/test-tuning.types';

const RADIO_MODE_OPTIONS = [
  { label: 'TEST', value: 'TEST' },
  { label: 'TUNING', value: 'TUNING' },
];

export function useTestTuningLogic(focusEqpIdInput: () => void) {
  const router = useRouter();

  const editEqpId = ref<string>('');
  const txtLot = ref<string>('');
  const radioMode = ref<ScreenMode>('TEST');
  const radioModeOptions = RADIO_MODE_OPTIONS;

  const spinnerMainOptions = ref<DropdownItem[]>([]);
  const spinnerSubOptions = ref<DropdownItem[]>([]);

  const selectedMain = ref<string>('');
  const selectedSub = ref<string>('');

  const gridData = ref<GridRowData[]>([]);
  const baseWidth = ref<number>(0);

  const isRadioTest = computed<boolean>(() => radioMode.value === 'TEST');

  const columns = computed<RevoGridColumn[]>(() => {
    const width = baseWidth.value > 0 ? baseWidth.value : 600;

    if (isRadioTest.value) {
      return [
        {
          prop: 'SLOT',
          name: 'SLOT',
          cellAlign: 'center',
          size: Math.floor((width / 24) * 2),
        },
        {
          prop: 'RECIPE',
          name: 'RECIPE',
          cellAlign: 'center',
          size: Math.floor((width / 24) * 9),
        },
        {
          prop: 'CHAMBER',
          name: 'CH',
          cellAlign: 'center',
          size: Math.floor((width / 24) * 2),
        },
        {
          prop: 'MEAS_RECIPE',
          name: '계측 Recipe',
          cellAlign: 'right',
          size: Math.floor((width / 24) * 11),
        },
      ];
    }

    return [
      {
        prop: 'PROD_RCP',
        name: 'RECIPE',
        cellAlign: 'left',
        size: Math.floor((width / 6) * 3),
      },
      {
        prop: 'CHAM_STEP',
        name: 'CH',
        cellAlign: 'center',
        size: Math.floor(width / 6),
      },
      {
        prop: 'BE_TIME',
        name: '전',
        cellAlign: 'center',
        size: Math.floor(width / 6),
      },
      {
        prop: 'AF_TIME',
        name: '후',
        cellAlign: 'center',
        size: Math.floor(width / 6),
        cellProperties: () => ({
          // Android Color.parseColor('#b3ffe0de') is ARGB (alpha=b3, RGB=ffe0de).
          // CSS 8-digit hex is RRGGBBAA, so the same color is '#ffe0deb3'.
          style: {
            backgroundColor: '#ffe0deb3',
            color: '#000000',
          },
        }),
      },
    ];
  });

  const showError = (message: string): void => {
    void okDialog.show(COMMON_FIELD.TXTDIALOGTITLE_ERROR, message, COMMON_FIELD.BTNOKSTR);
  };

  const getMainInfo = async (): Promise<void> => {
    const valEqpId = editEqpId.value;
    gridData.value = [];
    txtLot.value = '';

    try {
      const result = await testTuningService.getMainInfo(valEqpId);

      if (result.ok) {
        const RCP_GROUP = result.rcpGroup ?? '';
        selectedMain.value = '';
        selectedSub.value = '';
        spinnerMainOptions.value = [];
        spinnerSubOptions.value = [];

        if (RCP_GROUP.length > 0) {
          const splitList = RCP_GROUP.split('|');
          spinnerMainOptions.value = splitList.map((item) => ({
            label: item,
            value: item,
          }));
        }
      } else {
        showError(result.message ?? '');
        editEqpId.value = '';
        focusEqpIdInput();
      }
    } catch {
      showError('API request failed');
      editEqpId.value = '';
      focusEqpIdInput();
    }
  };

  const getSubInfo = async (): Promise<void> => {
    if (!selectedMain.value) {
      return;
    }

    txtLot.value = '';
    const valEqpId = editEqpId.value;
    const valMainId = selectedMain.value;
    const varTypeId = isRadioTest.value ? 'TEST' : 'TUNING';

    try {
      const result = await testTuningService.getSubInfo(valEqpId, valMainId, varTypeId);

      if (result.ok) {
        const sSUBID = result.subId ?? '';
        selectedSub.value = '';
        spinnerSubOptions.value = [];

        if (sSUBID.length > 0) {
          const splitList = sSUBID.split('|');
          spinnerSubOptions.value = splitList.map((item) => ({
            label: item,
            value: item,
          }));
        }
      } else {
        showError(result.message ?? '');
      }
    } catch {
      showError('API request failed');
    }
  };

  const getBodyInfo = async (): Promise<void> => {
    if (!selectedMain.value || !selectedSub.value) {
      return;
    }

    txtLot.value = '';
    gridData.value = [];

    const valEqpId = editEqpId.value;
    const valMainId = selectedMain.value;
    const valSubId = selectedSub.value;

    if (valMainId === '' || valSubId === '') {
      return;
    }

    const varTypeId = isRadioTest.value ? 'TEST' : 'TUNING';

    try {
      const result = await testTuningService.getBodyInfo(valEqpId, valMainId, valSubId, varTypeId);

      gridData.value = [];

      if (result.ok) {
        gridData.value = result.body ?? [];

        if (varTypeId === 'TEST') {
          txtLot.value = result.lotId ?? '';
        }
      } else {
        showError(result.message ?? '');
      }
    } catch {
      showError('API request failed');
    }
  };

  // Kotlin: editEqpId.text.contains("EQP-") -> BarcodeStyle.eqpId() strips the "EQP-" prefix
  // and trailing scanner character; a manually typed machine name (no "EQP-") passes through.
  const handleEditorAction = async (): Promise<void> => {
    if (editEqpId.value.includes('EQP-')) {
      const { isValid, parsedId } = barcodeStyleEqpId(editEqpId.value);
      editEqpId.value = parsedId;
      if (isValid) {
        await getMainInfo();
      }
    } else {
      await getMainInfo();
    }
  };

  const handleSearchClick = async (): Promise<void> => {
    await getMainInfo();
  };

  const handleCancelClick = (): void => {
    router.back();
  };

  const handleRadioChange = async (mode: string | number): Promise<void> => {
    if (mode !== 'TEST' && mode !== 'TUNING') {
      return;
    }
    if (radioMode.value !== mode) {
      radioMode.value = mode;
      await getMainInfo();
    }
  };

  const onMainSpinnerChange = async (value: string): Promise<void> => {
    selectedMain.value = value;
    await getSubInfo();
  };

  const onSubSpinnerChange = async (value: string): Promise<void> => {
    selectedSub.value = value;
    await getBodyInfo();
  };

  return {
    editEqpId,
    txtLot,
    radioMode,
    radioModeOptions,
    isRadioTest,
    spinnerMainOptions,
    spinnerSubOptions,
    selectedMain,
    selectedSub,
    gridData,
    columns,
    baseWidth,
    getMainInfo,
    getSubInfo,
    getBodyInfo,
    handleEditorAction,
    handleSearchClick,
    handleCancelClick,
    handleRadioChange,
    onMainSpinnerChange,
    onSubSpinnerChange,
  };
}
