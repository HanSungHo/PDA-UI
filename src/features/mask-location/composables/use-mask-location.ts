import type { BaseOption } from 'src/components/base/dropdown-list/base-dropdown-list.types';
import { parseEqpBarcode, removeScannerCharacter } from 'src/utils/barcode-style';
import { reactive, toRefs } from 'vue';

import { maskLocationService as service } from '../services/mask-location.service';
import type { MaskDevice, MaskDialog, MaskFocus, MaskResult } from '../types/mask-location.types';

export function useMaskLocation({
  device,
  focus,
}: {
  device: MaskDevice;
  focus: (field: MaskFocus) => void;
}) {
  const s = reactive({
    maskTag: '',
    reticleId: '',
    location: '',
    machine: '',
    shelf: '',
    product: '',
    status: '',
    useYn: '',
    currentLocation: '',
    pellicle: '',
    psm: '',
    inspection: '',
    manual: false,
    maskLoaded: false,
    loading: false,
    dialog: undefined as MaskDialog | undefined,
    floor: undefined as string | undefined,
    selectedStatus: undefined as string | undefined,
    locGroup: undefined as string | undefined,
    detailLocation: undefined as string | undefined,
    floorOptions: [] as BaseOption[],
    statusOptions: [] as BaseOption[],
    locGroupOptions: [] as BaseOption[],
    detailOptions: [] as BaseOption[],
  });
  let afterDialogAcknowledged: (() => void) | undefined;
  const options = (values: string[]) => values.map((value) => ({ label: value, value }));
  function error(message: string, title = '에  러') {
    s.dialog = { title, message };
  }
  function closeDialog() {
    const after = afterDialogAcknowledged;
    afterDialogAcknowledged = undefined;
    after?.();
    s.dialog = undefined;
  }
  async function request<T>(call: () => Promise<MaskResult<T>>, success: (data: T) => void) {
    s.loading = true;
    try {
      const result = await call();
      if (result.ok) success(result.data);
      else error(result.message);
    } finally {
      s.loading = false;
    }
  }
  function clearDetail() {
    s.detailLocation = undefined;
    s.detailOptions = [];
  }
  function clearGroup() {
    s.locGroup = undefined;
    s.locGroupOptions = [];
    clearDetail();
  }
  function clearStatus() {
    s.selectedStatus = undefined;
    s.statusOptions = [];
    clearGroup();
  }
  function initDisable() {
    s.manual = false;
    s.maskLoaded = false;
    s.floor = undefined;
    s.floorOptions = [];
    clearStatus();
  }
  function clearInfo() {
    s.shelf = '';
    s.product = '';
    s.status = '';
    s.useYn = '';
    s.currentLocation = '';
    s.machine = '';
    s.inspection = '';
    s.reticleId = '';
    // Activity intentionally retains PELLICLE/PSM until the next successful lookup.
    initDisable();
  }
  async function setMaskInfo() {
    if (s.loading) return;
    clearInfo();
    if (!s.maskTag) {
      error('위치 변경할 Mask를 읽어주세요.');
      focus('mask');
      return;
    }
    s.reticleId = removeScannerCharacter(s.maskTag);
    s.maskTag = s.reticleId;
    await request(
      () => service.maskInfo(s.reticleId, device),
      (data) => {
        s.maskTag = data.RETICLETAG;
        s.shelf = data.SHELF;
        s.product = data.PRODUCT;
        s.status = data.STATUS;
        s.pellicle = data.PELLICLE;
        s.psm = data.CUSTOMER;
        s.currentLocation = data.CURRLOC;
        s.machine = data.SUBLOCATION3;
        s.useYn = data.ISUSE === '사용가능' ? '사용가능' : '사용불가';
        s.inspection = data.RMSINSP !== 'RUN' && data.RMSID === 'Y' ? 'SKIP' : '';
        s.maskLoaded = true;
        focus('location');
      },
    );
  }
  function setFloorSpinner() {
    s.floorOptions = options(['2F', '4F', '6F']);
    s.floor = undefined;
  }
  async function setStatusSpinner() {
    await request(
      () => service.maskStatusInfo(device),
      (values) => {
        s.statusOptions = options(values);
      },
    );
  }
  async function manualLocationCombo(check: boolean) {
    if (s.loading) return;
    s.manual = check;
    if (check) {
      setFloorSpinner();
      await setStatusSpinner();
    } else {
      s.floor = undefined;
      s.floorOptions = [];
      clearStatus();
    }
  }
  async function setCurrentLocSpinner() {
    if (s.selectedStatus === undefined) {
      error('상태를 선택해주세요');
      return;
    }
    await request(
      () => service.maskLocGroupInfo(s.selectedStatus!, s.floor ?? '', device),
      (values) => {
        s.locGroupOptions = options(values);
      },
    );
  }
  async function setDetailLocation() {
    if (s.selectedStatus === undefined) {
      error('상태를 선택해주세요');
      return;
    }
    if (s.locGroup === undefined) {
      error('현재위치를 선택해주세요');
      return;
    }
    await request(
      () => service.maskLocationInfo(s.selectedStatus!, s.locGroup!, s.floor ?? '', device),
      (values) => {
        clearDetail();
        s.detailOptions = options(values);
      },
    );
  }
  async function changeFloor(value: string | undefined) {
    if (s.loading) return;
    s.floor = value;
    clearStatus();
    await setStatusSpinner();
  }
  async function changeStatus(value: string | undefined) {
    if (s.loading) return;
    s.selectedStatus = value;
    clearGroup();
    await setCurrentLocSpinner();
  }
  async function changeLocGroup(value: string | undefined) {
    if (s.loading) return;
    s.locGroup = value;
    clearDetail();
    await setDetailLocation();
  }
  async function changeDetailLocation(value: string | undefined) {
    if (s.loading) return;
    s.detailLocation = value;
    if (value !== undefined) await checkPMSShelf(value);
  }
  async function checkShelf(call: () => Promise<MaskResult<string>>, message: string) {
    await request(call, (value) => {
      if (value === 'N') {
        error(message);
        afterDialogAcknowledged = () => {
          if (s.manual) void setDetailLocation();
          else s.location = '';
        };
      }
    });
  }
  async function checkMaskPMS(pmsShelf: string) {
    await checkShelf(
      () => service.checkMaskPMS(s.maskTag, pmsShelf, device),
      'PSM MASK 입니다.\n전용 SHELF를 지정해야 합니다.',
    );
  }
  async function checkPM() {
    // The Activity reads editLocation even when the user selects a manual detail.
    await checkShelf(
      () => service.checkPellicle(s.maskTag, s.location, device),
      'Pellicle이 다른 장비입니다.',
    );
  }
  async function checkPMSShelf(mask: string) {
    if (s.loading) return;
    if (!s.maskTag) {
      error('MASK를 입력하세요.');
      focus('mask');
      return;
    }
    if (s.product === 'PM') await checkPM();
    else await checkMaskPMS(mask);
  }
  async function readLocation() {
    if (s.loading) return;
    const { hasPrefix, parsedId } = parseEqpBarcode(s.location);
    if (!hasPrefix) {
      s.location = '';
      error('진행할 장비를 읽어주세요.', 'READING ERROR');
      return;
    }
    s.location = parsedId;
    if (s.location) await checkPMSShelf(s.location);
  }
  async function changeMaskLoc() {
    if (s.loading) return;
    if (!s.maskTag) {
      error('MASK를 입력하세요.');
      return;
    }
    if (s.manual) {
      if (s.selectedStatus === undefined) {
        error('변경할 STATUS를 입력하세요.');
        return;
      }
      if (s.locGroup === undefined) {
        error('변경할 위치를 입력하세요.');
        return;
      }
      if (s.detailLocation === undefined) {
        error('변경할 상세위치를 입력하세요.');
        return;
      }
    } else if (!s.location) {
      error('위치를 입력하세요.');
      return;
    }
    await request(
      () =>
        service.changeMaskLocation(
          {
            RETICLEID: s.reticleId,
            FACILITY: device.facility,
            LOCTYPE: s.manual ? 'ETC' : '',
            LOCATION: s.manual ? '' : s.location,
            ETCSTATUS: s.manual ? (s.selectedStatus ?? '') : '',
            ETCLOCATION: s.manual ? (s.locGroup ?? '') : '',
            ETCDETAILLOC: s.manual ? (s.detailLocation ?? '') : '',
            SUBLOCATION3: s.machine,
            OPERATORID: device.operatorId,
            FLOOR: s.manual ? (s.floor ?? '') : '',
          },
          device,
        ),
      (data) => {
        const reset = () => {
          s.maskTag = '';
          s.location = '';
          clearInfo();
          focus('mask');
        };
        if (Number(data.SCOUNT) === 1)
          s.dialog = { title: '확인', message: `${data.RETCILES} 위치가 변경되었습니다.` };
        else if (Number(data.SCOUNT) > 1)
          s.dialog = {
            title: '확인',
            message: `동일한 Serial/위치인 MASK가 변경되었습니다.\n[${data.RETCILES}]`,
          };
        if (s.dialog) afterDialogAcknowledged = reset;
        else reset();
      },
    );
  }
  return {
    ...toRefs(s),
    closeDialog,
    initDisable,
    clearInfo,
    setMaskInfo,
    setFloorSpinner,
    setStatusSpinner,
    manualLocationCombo,
    setCurrentLocSpinner,
    setDetailLocation,
    changeFloor,
    changeStatus,
    changeLocGroup,
    changeDetailLocation,
    checkPMSShelf,
    checkMaskPMS,
    checkPM,
    readLocation,
    changeMaskLoc,
  };
}
