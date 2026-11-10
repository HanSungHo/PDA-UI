<template>
  <BaseScreen :title="`환경설정 v${appVersion}`" class="setting-page">
    <section class="ds-screen__card setting-card" aria-labelledby="setting-location-title">
      <h2 id="setting-location-title" class="ds-screen__card-title">위치설정</h2>
      <BaseDropdownList
        ref="facilityDropdown"
        data-testid="facility"
        label="FACILITY"
        placeholder=""
        size="small"
        :model-value="form.facility || undefined"
        :options="facilityOptions"
        :loading="loading.facility"
        @click.capture="handleDropdownClick('facility', $event)"
        @update:model-value="selectFacility"
      />
      <BaseDropdownList
        ref="areaDropdown"
        data-testid="area"
        label="AREA"
        placeholder=""
        size="small"
        :model-value="form.area || undefined"
        :options="areaOptions"
        :loading="loading.area"
        @click.capture="handleDropdownClick('area', $event)"
        @update:model-value="selectArea"
      />
      <BaseDropdownList
        ref="bayDropdown"
        data-testid="bay"
        label="BAY"
        placeholder=""
        size="small"
        :model-value="form.bay || undefined"
        :options="bayOptions"
        :loading="loading.bay"
        @click.capture="handleDropdownClick('bay', $event)"
        @update:model-value="selectBay"
      />
    </section>

    <section
      class="ds-screen__card setting-card setting-card--sheet"
      aria-labelledby="setting-sheet-title"
    >
      <h2 id="setting-sheet-title" class="ds-screen__card-title">e-Sheet 설정</h2>
      <BaseInput
        data-testid="history-count"
        label="History Count"
        name="historyCount"
        type="number"
        size="small"
        :max-length="4"
        autocomplete="off"
        :model-value="form.historyCount"
        @update:model-value="form.historyCount = normalizeInputCount($event)"
      />
      <BaseInput
        data-testid="forward-count"
        label="Forward Count"
        name="forwardCount"
        type="number"
        size="small"
        :max-length="4"
        autocomplete="off"
        :model-value="form.forwardCount"
        @update:model-value="form.forwardCount = normalizeInputCount($event)"
      />
    </section>

    <template #footer>
      <BaseButton
        variant="primary"
        size="medium"
        :disabled="saving"
        data-testid="btn-ok"
        @click="singleClick(() => void executeSetting())"
        >확인</BaseButton
      >
      <BaseButton
        variant="tertiary"
        size="medium"
        :disabled="saving"
        data-testid="btn-cancel"
        @click="singleClick(() => void finish(SETTING_RESULT.CANCELED))"
        >취소</BaseButton
      >
    </template>
  </BaseScreen>

  <BaseModal
    :open="dialog.open"
    :title="dialog.title"
    :closable="false"
    :overlay-closable="false"
    class="setting-dialog"
  >
    <p class="setting-dialog__message">{{ dialog.message }}</p>
    <template #footer
      ><BaseButton variant="tertiary" size="medium" data-testid="dialog-ok" @click="handleDialog"
        >확인</BaseButton
      ></template
    >
  </BaseModal>
</template>

<script setup lang="ts">
import type { BaseDropdownValue, BaseInputValue, BaseOption } from 'src/components/base';
import {
  BaseButton,
  BaseDropdownList,
  BaseInput,
  BaseModal,
  BaseScreen,
} from 'src/components/base';
import { ROUTE } from 'src/constants/routes';
import {
  SETTING_RESULT,
  type SettingResult,
  useMainStore,
} from 'src/features/main/stores/main.store';
import { getWifiIpAddress } from 'src/features/system-setting/services/system-setting-native.service';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { createSingleClick } from '../composables/single-click';
import { settingApi } from '../services/setting.api';
import type { SettingInfo } from '../types/setting.types';

defineOptions({ name: 'SettingPage' });
type DialogAction = 'none' | 'send-config' | 'finish-ok';
type DropdownName = 'facility' | 'area' | 'bay';
interface DropdownInstance {
  $el: HTMLElement;
}
const router = useRouter();
const store = useMainStore();
const appVersion = computed(() => store.versionName);
const api = settingApi;
const form = reactive<SettingInfo>({
  facility: '',
  area: '',
  bay: '',
  historyCount: '10',
  forwardCount: '10',
});
const facilityItems = ref<string[]>([]);
const areaItems = ref<string[]>([]);
const bayItems = ref<string[]>([]);
const toOptions = (items: string[]): BaseOption[] =>
  items.map((value) => ({ label: value, value }));
const facilityOptions = computed(() => toOptions(facilityItems.value));
const areaOptions = computed(() => toOptions(areaItems.value));
const bayOptions = computed(() => toOptions(bayItems.value));
const loading = reactive({ facility: false, area: false, bay: false });
const facilityDropdown = ref<DropdownInstance | null>(null);
const areaDropdown = ref<DropdownInstance | null>(null);
const bayDropdown = ref<DropdownInstance | null>(null);
const reopeningDropdown = ref<DropdownName | null>(null);
const saving = ref(false);
// Android: btn_ok and btn_cancel share one OnSingleClickListener (1000 ms).
const singleClick = createSingleClick();
const dialog = reactive({ open: false, title: '', message: '', action: 'none' });

function openDialog(title: string, message: string, action: DialogAction = 'none'): void {
  Object.assign(dialog, { open: true, title, message, action });
}
function warning(message: string): void {
  openDialog('경  고', message);
}
function normalizeInputCount(value: BaseInputValue): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 4);
}
function capCount(value: string): string {
  return Number(value) > 2000 ? '2000' : value;
}
function valueOf(value: BaseDropdownValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function selectFacility(value: BaseDropdownValue): void {
  form.facility = valueOf(value);
  form.area = '';
  form.bay = '';
  areaItems.value = [];
  bayItems.value = [];
}
function selectArea(value: BaseDropdownValue): void {
  form.area = valueOf(value);
  form.bay = '';
  bayItems.value = [];
}
function selectBay(value: BaseDropdownValue): void {
  form.bay = valueOf(value);
}

function dropdownRef(name: DropdownName) {
  return {
    facility: facilityDropdown,
    area: areaDropdown,
    bay: bayDropdown,
  }[name];
}

/**
 * Legacy SpinnerTouchEvent consumes the original touch, then calls
 * performClick() once its async adapter data has been installed. Recreate
 * that sequence locally without changing the shared BaseDropdownList API.
 */
async function reopenDropdown(name: DropdownName): Promise<void> {
  await nextTick();
  const control = dropdownRef(name).value?.$el?.querySelector<HTMLElement>('.q-field__control');
  if (!control) return;

  reopeningDropdown.value = name;
  control.click();
  queueMicrotask(() => {
    if (reopeningDropdown.value === name) reopeningDropdown.value = null;
  });
}

function handleDropdownClick(name: DropdownName, event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.q-field__control')) return;

  if (reopeningDropdown.value === name) {
    reopeningDropdown.value = null;
    return;
  }

  // Match legacy SpinnerTouchEvent: consume the initial touch so QSelect
  // cannot open an empty/stale menu, then reopen only after the API resolves.
  event.preventDefault();
  event.stopPropagation();

  if (name === 'facility') void initFacilitySpinner();
  else if (name === 'area') void initAreaSpinner();
  else void initBaySpinner();
}

async function initFacilitySpinner(): Promise<void> {
  if (loading.facility) return;
  form.area = '';
  form.bay = '';
  areaItems.value = [];
  bayItems.value = [];
  loading.facility = true;
  try {
    facilityItems.value = await api.getFacility();
    form.facility = '';
  } catch {
    /* Legacy keeps the current facility adapter and does not show a dialog. */
  } finally {
    loading.facility = false;
    await reopenDropdown('facility');
  }
}
async function initAreaSpinner(): Promise<void> {
  if (!form.facility) return warning('PLEASE FACILITY');
  if (loading.area) return;
  form.bay = '';
  bayItems.value = [];
  loading.area = true;
  try {
    areaItems.value = await api.getArea(form.facility);
  } catch {
    areaItems.value = [];
  } finally {
    form.area = '';
    loading.area = false;
    await reopenDropdown('area');
  }
}
async function initBaySpinner(): Promise<void> {
  if (!form.facility || !form.area) return warning('PLEASE AREA');
  if (loading.bay) return;
  loading.bay = true;
  try {
    bayItems.value = await api.getBay(form.area, form.facility);
  } catch {
    bayItems.value = [];
  } finally {
    form.bay = '';
    loading.bay = false;
    await reopenDropdown('bay');
  }
}

async function executeSetting(): Promise<void> {
  if (!form.facility) return warning('FACILITY를 선택해주세요');
  if (!form.area) return warning('AREA를 선택해주세요');
  if (!form.bay) return warning('BAY를 선택해주세요');
  if (!form.historyCount) return warning('History Count를 입력해주세요');
  if (!form.forwardCount) return warning('Forward Count를 입력해주세요');
  // Android keeps the raw typed strings in DeviceInfo but persists the capped Int values.
  const runtimeCounts = { historyCount: form.historyCount, forwardCount: form.forwardCount };
  form.historyCount = capCount(form.historyCount);
  form.forwardCount = capCount(form.forwardCount);
  const persisted = {
    ...form,
    historyCount: String(Number(form.historyCount)),
    forwardCount: String(Number(form.forwardCount)),
  };
  saving.value = true;
  try {
    await store.saveSettingInfo(persisted, runtimeCounts);
    store.setSettingResult(SETTING_RESULT.OK);
    openDialog('환경설정', '환경설정 정보가 저장 되었습니다', 'send-config');
  } finally {
    saving.value = false;
  }
}
async function handleDialog(): Promise<void> {
  const action = dialog.action;
  dialog.open = false;
  dialog.action = 'none';
  if (action === 'none') return;
  if (action === 'finish-ok') return finish(SETTING_RESULT.OK);
  const wifiIpAddress = await getWifiIpAddress();
  if (wifiIpAddress) {
    try {
      await api.sendConfig(wifiIpAddress);
    } catch (error) {
      return openDialog(
        '에  러',
        error instanceof Error ? error.message : String(error),
        'finish-ok',
      );
    }
  }
  await finish(SETTING_RESULT.OK);
}
async function finish(result: SettingResult): Promise<void> {
  store.setSettingResult(result);
  if (router.options.history.state.back) router.back();
  else await router.replace(`/${ROUTE.main}`);
}
onMounted(async () => {
  store.setSettingResult(null);
  // Setting is a standalone route, unlike the launcher route that initializes
  // the runtime server URL. Initialize here before issuing legacy messages.
  await store.initMain();
  const saved = await store.loadSettingInfo();
  if (!saved || !saved.facility || !saved.area || !saved.bay) return;
  Object.assign(form, saved);
  facilityItems.value = [form.facility];
  areaItems.value = [form.area];
  bayItems.value = [form.bay];
});
</script>

<style scoped>
/* Figma: History/Forward Count labels stay on one line in a wider shared column (13ch fits both). */
.setting-card--sheet > * {
  --ds-field-label-width: 13ch;
}

.setting-dialog__message {
  margin: 0;
}
</style>
